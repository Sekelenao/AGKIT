import type { Command } from 'commander';
import type { UserConfig } from '../../config/user-config.js';
import type { UserConfigStore } from '../../config/user-config-store.js';
import type { GitRepositoryCache } from '../../git/git-repository-cache.js';
import type { CliCommand } from '../cli-command.js';

export interface ConfigResult {
  readonly config: UserConfig;
  readonly cacheDir: string;
}

interface ConfigCliOptions {
  readonly repo: string;
  readonly ref?: string;
}

export class ConfigCommand implements CliCommand {
  private readonly configStore: UserConfigStore;
  private readonly repositoryCache: GitRepositoryCache;

  constructor(
    configStore: UserConfigStore,
    repositoryCache: GitRepositoryCache,
  ) {
    this.configStore = configStore;
    this.repositoryCache = repositoryCache;
  }

  register(program: Command): void {
    program
      .command('config')
      .description('Configure the template Git repository')
      .requiredOption('--repo <url>', 'Git URL of the template repository')
      .option('--ref <ref>', 'Default branch or tag to track')
      .action(async (options: ConfigCliOptions): Promise<void> => {
        const result = await this.execute({
          git_repository_url: options.repo,
          default_ref: options.ref,
        });

        console.log(`Configured repository: ${result.config.git_repository_url}`);
        console.log(`Synced local cache: ${result.cacheDir}`);
      });
  }

  async execute(config: UserConfig): Promise<ConfigResult> {
    const cacheDir = await this.repositoryCache.sync(
      config.git_repository_url,
      config.default_ref,
    );
    await this.configStore.save(config);

    return {
      config,
      cacheDir,
    };
  }
}
