import type { Command } from 'commander';
import { MissingConfigError } from '../../config/missing-config-error.js';
import type { UserConfigStore } from '../../config/user-config-store.js';
import type { GitRepositoryCache } from '../../git/git-repository-cache.js';
import type { TemplateModule } from '../../template/template-module.js';
import type { TemplateRepositoryLoader } from '../../template/template-repository-loader.js';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';

export interface ListResult {
  readonly modules: readonly TemplateModule[];
  readonly cacheDir: string;
}

export class ListCommand implements CliCommand {
  private readonly configStore: UserConfigStore;
  private readonly repositoryCache: GitRepositoryCache;
  private readonly templateLoader: TemplateRepositoryLoader;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    configStore: UserConfigStore,
    repositoryCache: GitRepositoryCache,
    templateLoader: TemplateRepositoryLoader,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.configStore = configStore;
    this.repositoryCache = repositoryCache;
    this.templateLoader = templateLoader;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('list')
      .description('List available template modules from the configured repository')
      .action(async (): Promise<void> => {
        const result = await this.execute();

        for (const line of this.outputFormatter.formatModuleList(result.modules)) {
          console.log(line);
        }
      });
  }

  async execute(): Promise<ListResult> {
    const config = await this.configStore.load();
    if (config === undefined) {
      throw new MissingConfigError();
    }

    const cacheDir = await this.repositoryCache.sync(
      config.git_repository_url,
      config.default_ref,
    );
    const modules = await this.templateLoader.loadAll(cacheDir);

    return {
      modules,
      cacheDir,
    };
  }
}
