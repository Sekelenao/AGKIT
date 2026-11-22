import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Command } from 'commander';
import type { GitRepositoryCache } from '../../git/git-repository-cache.js';
import type { Harness } from '../../harness/harness.js';
import type { HarnessRegistry } from '../../harness/harness-registry.js';
import type { ContentHasher } from '../../manifest/content-hasher.js';
import { InvalidManifestError } from '../../manifest/invalid-manifest-error.js';
import { MissingManifestError } from '../../manifest/missing-manifest-error.js';
import type { ProjectManifestStore } from '../../manifest/project-manifest-store.js';
import type { ModuleComposer } from '../../template/module-composer.js';
import type { ComposedTemplates } from '../../template/template-module.js';
import type { TemplateRepositoryLoader } from '../../template/template-repository-loader.js';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';
import { SyncConflictError } from './sync-conflict-error.js';

export type ConflictResolution = 'overwrite' | 'keep' | 'backup';

export interface SyncConflict {
  readonly relativePath: string;
  readonly localContent: string;
  readonly upstreamContent: string | undefined;
}

export interface SyncOptions {
  readonly targetDir: string;
  readonly force?: boolean;
  readonly resolveConflict?: (conflict: SyncConflict) => Promise<ConflictResolution>;
}

export interface SyncResult {
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly deletedFiles: readonly string[];
  readonly backedUpFiles: readonly string[];
  readonly keptConflictFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
}

interface SyncCliOptions {
  readonly force?: boolean;
}

interface DesiredFile {
  readonly content: string;
  readonly hash: string;
}

export class SyncCommand implements CliCommand {
  private readonly harnessRegistry: HarnessRegistry;
  private readonly repositoryCache: GitRepositoryCache;
  private readonly templateLoader: TemplateRepositoryLoader;
  private readonly moduleComposer: ModuleComposer;
  private readonly manifestStore: ProjectManifestStore;
  private readonly contentHasher: ContentHasher;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    harnessRegistry: HarnessRegistry,
    repositoryCache: GitRepositoryCache,
    templateLoader: TemplateRepositoryLoader,
    moduleComposer: ModuleComposer,
    manifestStore: ProjectManifestStore,
    contentHasher: ContentHasher,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.harnessRegistry = harnessRegistry;
    this.repositoryCache = repositoryCache;
    this.templateLoader = templateLoader;
    this.moduleComposer = moduleComposer;
    this.manifestStore = manifestStore;
    this.contentHasher = contentHasher;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('sync')
      .description('Synchronize managed AI templates with the upstream repository')
      .option('--force', 'Overwrite locally modified files on conflict')
      .action(async (options: SyncCliOptions): Promise<void> => {
        const result = await this.execute({
          targetDir: process.cwd(),
          force: options.force === true,
        });

        this.printSummary(result);

        if (result.keptConflictFiles.length > 0) {
          throw new SyncConflictError(result.keptConflictFiles);
        }
      });
  }

  async execute(options: SyncOptions): Promise<SyncResult> {
    const manifest = await this.manifestStore.load(options.targetDir);
    if (manifest === undefined) {
      throw new MissingManifestError();
    }

    const harness = this.harnessRegistry.resolve(manifest.harness);
    const cacheDir = await this.repositoryCache.sync(
      manifest.git_repository_url,
      manifest.ref,
    );
    const modules = await this.templateLoader.loadAll(cacheDir);
    const composed = this.moduleComposer.compose(modules, manifest.modules);
    const desiredFiles = this.buildDesiredFiles(harness, composed);

    const createdFiles: string[] = [];
    const updatedFiles: string[] = [];
    const deletedFiles: string[] = [];
    const backedUpFiles: string[] = [];
    const keptConflictFiles: string[] = [];
    const unchangedFiles: string[] = [];
    const nextManagedFiles: Record<string, string> = {};

    for (const [posixPath, desired] of desiredFiles) {
      const localContent = await this.readOptionalLocalFile(options.targetDir, posixPath);
      const manifestHash = manifest.managed_files[posixPath];

      if (localContent === undefined) {
        await this.writeLocalFile(options.targetDir, posixPath, desired.content);
        createdFiles.push(posixPath);
        nextManagedFiles[posixPath] = desired.hash;
        continue;
      }

      const localHash = this.contentHasher.hash(localContent);
      if (localHash === desired.hash) {
        unchangedFiles.push(posixPath);
        nextManagedFiles[posixPath] = desired.hash;
        continue;
      }

      if (manifestHash !== undefined && localHash === manifestHash) {
        await this.writeLocalFile(options.targetDir, posixPath, desired.content);
        updatedFiles.push(posixPath);
        nextManagedFiles[posixPath] = desired.hash;
        continue;
      }

      const resolution = await this.determineConflictResolution(options, {
        relativePath: posixPath,
        localContent,
        upstreamContent: desired.content,
      });
      if (resolution === 'overwrite') {
        await this.writeLocalFile(options.targetDir, posixPath, desired.content);
        updatedFiles.push(posixPath);
        nextManagedFiles[posixPath] = desired.hash;
      } else if (resolution === 'backup') {
        const backupPath = `${posixPath}.bak`;
        await this.writeLocalFile(options.targetDir, backupPath, localContent);
        await this.writeLocalFile(options.targetDir, posixPath, desired.content);
        backedUpFiles.push(backupPath);
        updatedFiles.push(posixPath);
        nextManagedFiles[posixPath] = desired.hash;
      } else {
        keptConflictFiles.push(posixPath);
        if (manifestHash !== undefined) {
          nextManagedFiles[posixPath] = manifestHash;
        }
      }
    }

    for (const [posixPath, manifestHash] of Object.entries(manifest.managed_files)) {
      if (desiredFiles.has(posixPath)) {
        continue;
      }

      const localContent = await this.readOptionalLocalFile(options.targetDir, posixPath);
      if (localContent === undefined) {
        continue;
      }

      const localHash = this.contentHasher.hash(localContent);
      if (localHash === manifestHash) {
        await this.deleteLocalFile(options.targetDir, posixPath);
        deletedFiles.push(posixPath);
        continue;
      }

      const resolution = await this.determineConflictResolution(options, {
        relativePath: posixPath,
        localContent,
        upstreamContent: undefined,
      });
      if (resolution === 'overwrite') {
        await this.deleteLocalFile(options.targetDir, posixPath);
        deletedFiles.push(posixPath);
      } else if (resolution === 'backup') {
        const backupPath = `${posixPath}.bak`;
        await this.writeLocalFile(options.targetDir, backupPath, localContent);
        await this.deleteLocalFile(options.targetDir, posixPath);
        backedUpFiles.push(backupPath);
        deletedFiles.push(posixPath);
      } else {
        keptConflictFiles.push(posixPath);
        nextManagedFiles[posixPath] = manifestHash;
      }
    }

    await this.manifestStore.save(options.targetDir, {
      ...manifest,
      managed_files: nextManagedFiles,
    });

    return {
      createdFiles,
      updatedFiles,
      deletedFiles,
      backedUpFiles,
      keptConflictFiles,
      unchangedFiles,
    };
  }

  private printSummary(result: SyncResult): void {
    for (const line of this.outputFormatter.formatSyncSummary(result)) {
      console.log(line);
    }
  }

  private buildDesiredFiles(
    harness: Harness,
    composed: ComposedTemplates,
  ): ReadonlyMap<string, DesiredFile> {
    const desired = new Map<string, DesiredFile>();

    if (composed.rootInstructions !== undefined) {
      const posixPath = this.toPosixPath(harness.rootInstructions.relativePath());
      desired.set(posixPath, {
        content: composed.rootInstructions,
        hash: this.contentHasher.hash(composed.rootInstructions),
      });
    }

    for (const skill of composed.skills) {
      for (const skillFile of harness.skills.render(skill)) {
        const posixPath = this.toPosixPath(skillFile.relativePath);
        desired.set(posixPath, {
          content: skillFile.content,
          hash: this.contentHasher.hash(skillFile.content),
        });
      }
    }

    for (const agentFile of harness.agents.render(composed.agents)) {
      const posixPath = this.toPosixPath(agentFile.relativePath);
      desired.set(posixPath, {
        content: agentFile.content,
        hash: this.contentHasher.hash(agentFile.content),
      });
    }

    return desired;
  }

  private async determineConflictResolution(
    options: SyncOptions,
    conflict: SyncConflict,
  ): Promise<ConflictResolution> {
    if (options.force === true) {
      return 'overwrite';
    }
    if (options.resolveConflict !== undefined) {
      return options.resolveConflict(conflict);
    }
    return 'keep';
  }

  private toPosixPath(relativePath: string): string {
    return relativePath.split(sep).join('/');
  }

  private toAbsolutePath(targetDir: string, posixPath: string): string {
    const base = resolve(targetDir);
    const absolute = resolve(base, ...posixPath.split('/'));
    if (absolute === base || !absolute.startsWith(`${base}${sep}`)) {
      throw new InvalidManifestError(
        `Unsafe managed file path "${posixPath}" escapes target directory.`,
      );
    }
    return absolute;
  }

  private async readOptionalLocalFile(
    targetDir: string,
    posixPath: string,
  ): Promise<string | undefined> {
    try {
      return await readFile(this.toAbsolutePath(targetDir, posixPath), 'utf8');
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async writeLocalFile(
    targetDir: string,
    posixPath: string,
    content: string,
  ): Promise<void> {
    const absolute = this.toAbsolutePath(targetDir, posixPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
  }

  private async deleteLocalFile(targetDir: string, posixPath: string): Promise<void> {
    await rm(this.toAbsolutePath(targetDir, posixPath), { force: true });
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
