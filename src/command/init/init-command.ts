import { sep } from 'node:path';
import type { Command } from 'commander';
import { MissingConfigError } from '../../config/missing-config-error.js';
import type { UserConfigStore } from '../../config/user-config-store.js';
import type { GitRepositoryCache } from '../../git/git-repository-cache.js';
import type { HarnessRegistry } from '../../harness/harness-registry.js';
import type { ContentHasher } from '../../manifest/content-hasher.js';
import type { ProjectManifestStore } from '../../manifest/project-manifest-store.js';
import type { ModuleComposer } from '../../template/module-composer.js';
import { TemplateRepositoryError } from '../../template/template-repository-error.js';
import type { TemplateRepositoryLoader } from '../../template/template-repository-loader.js';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';

export interface InitOptions {
  readonly targetDir: string;
  readonly harnessName: string;
  readonly moduleIds: readonly string[];
}

export interface InitResult {
  readonly resolvedModuleIds: readonly string[];
  readonly writtenFiles: readonly string[];
}

interface InitCliOptions {
  readonly harness: string;
  readonly module: readonly string[];
}

export class InitCommand implements CliCommand {
  private readonly harnessRegistry: HarnessRegistry;
  private readonly configStore: UserConfigStore;
  private readonly repositoryCache: GitRepositoryCache;
  private readonly templateLoader: TemplateRepositoryLoader;
  private readonly moduleComposer: ModuleComposer;
  private readonly manifestStore: ProjectManifestStore;
  private readonly contentHasher: ContentHasher;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    harnessRegistry: HarnessRegistry,
    configStore: UserConfigStore,
    repositoryCache: GitRepositoryCache,
    templateLoader: TemplateRepositoryLoader,
    moduleComposer: ModuleComposer,
    manifestStore: ProjectManifestStore,
    contentHasher: ContentHasher,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.harnessRegistry = harnessRegistry;
    this.configStore = configStore;
    this.repositoryCache = repositoryCache;
    this.templateLoader = templateLoader;
    this.moduleComposer = moduleComposer;
    this.manifestStore = manifestStore;
    this.contentHasher = contentHasher;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('init')
      .description('Initialize AI templates in the current project')
      .option(
        '--harness <name>',
        `Target AI harness (${this.harnessRegistry.listNames().join(', ')})`,
        'opencode',
      )
      .requiredOption('-m, --module <id...>', 'Template module ID(s) to apply')
      .action(async (options: InitCliOptions): Promise<void> => {
        const result = await this.execute({
          targetDir: process.cwd(),
          harnessName: options.harness,
          moduleIds: options.module,
        });

        for (const line of this.outputFormatter.formatInitSummary(result)) {
          console.log(line);
        }
      });
  }

  async execute(options: InitOptions): Promise<InitResult> {
    const harness = this.harnessRegistry.resolve(options.harnessName);

    if (options.moduleIds.length === 0) {
      throw new TemplateRepositoryError('At least one template module ID must be specified.');
    }

    const config = await this.configStore.load();
    if (config === undefined) {
      throw new MissingConfigError();
    }

    const cacheDir = await this.repositoryCache.sync(
      config.git_repository_url,
      config.default_ref,
    );
    const modules = await this.templateLoader.loadAll(cacheDir);
    const composed = this.moduleComposer.compose(modules, options.moduleIds);
    const writtenFiles: string[] = [];
    const managedFiles: Record<string, string> = {};

    if (composed.rootInstructions !== undefined) {
      const rootPath = await harness.rootInstructions.write(
        options.targetDir,
        composed.rootInstructions,
      );
      writtenFiles.push(rootPath);
      managedFiles[this.toPosixPath(rootPath)] = this.contentHasher.hash(
        composed.rootInstructions,
      );
    }

    for (const skill of composed.skills) {
      const skillPaths = await harness.skills.write(
        options.targetDir,
        skill.name,
        skill.files,
      );
      writtenFiles.push(...skillPaths);
      for (let index = 0; index < skill.files.length; index += 1) {
        const skillFile = skill.files[index];
        const writtenPath = skillPaths[index];
        if (skillFile !== undefined && writtenPath !== undefined) {
          managedFiles[this.toPosixPath(writtenPath)] = this.contentHasher.hash(
            skillFile.content,
          );
        }
      }
    }

    for (const agent of composed.agents) {
      const agentPath = await harness.agents.write(
        options.targetDir,
        agent.name,
        agent.content,
      );
      writtenFiles.push(agentPath);
      managedFiles[this.toPosixPath(agentPath)] = this.contentHasher.hash(agent.content);
    }

    const manifestFile = await this.manifestStore.save(options.targetDir, {
      harness: harness.name,
      modules: [...options.moduleIds],
      git_repository_url: config.git_repository_url,
      ...(config.default_ref === undefined ? {} : { ref: config.default_ref }),
      managed_files: managedFiles,
    });
    writtenFiles.push(manifestFile);

    return {
      resolvedModuleIds: composed.resolvedModules.map((mod) => mod.id),
      writtenFiles,
    };
  }

  private toPosixPath(relativePath: string): string {
    return relativePath.split(sep).join('/');
  }
}
