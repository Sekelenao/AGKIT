import { access, rm } from 'node:fs/promises';
import type { Command } from 'commander';
import type { AgkitPaths } from '../../config/agkit-paths.js';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';

export interface ResetOptions {
  readonly cache?: boolean;
  readonly config?: boolean;
}

export interface ResetResult {
  readonly removedPaths: readonly string[];
}

export class ResetCommand implements CliCommand {
  private readonly paths: AgkitPaths;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    paths: AgkitPaths,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.paths = paths;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('reset')
      .description('Remove local agkit configuration and/or Git cache')
      .option('--cache', 'Remove only the local Git cache')
      .option('--config', 'Remove only the user configuration file')
      .action(async (options: ResetOptions): Promise<void> => {
        const result = await this.execute(options);

        for (const line of this.outputFormatter.formatResetSummary(result)) {
          console.log(line);
        }
      });
  }

  async execute(options: ResetOptions = {}): Promise<ResetResult> {
    const targets = this.resolveTargets(options);
    const removedPaths: string[] = [];

    for (const target of targets) {
      if (await this.exists(target)) {
        await rm(target, { recursive: true, force: true });
        removedPaths.push(target);
      }
    }

    return { removedPaths };
  }

  private resolveTargets(options: ResetOptions): readonly string[] {
    const resetCache = options.cache === true;
    const resetConfig = options.config === true;

    if (!resetCache && !resetConfig) {
      return [this.paths.rootDir];
    }

    const targets: string[] = [];
    if (resetConfig) {
      targets.push(this.paths.configFilePath);
    }
    if (resetCache) {
      targets.push(this.paths.cacheDir);
    }
    return targets;
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
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
