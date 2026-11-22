import type { ConfigCommand } from '../command/config/config-command.js';
import type { InitCommand } from '../command/init/init-command.js';
import type { ListCommand } from '../command/list/list-command.js';
import { NewCommand } from '../command/new/new-command.js';
import type { SyncCommand } from '../command/sync/sync-command.js';
import type { UserConfig } from '../config/user-config.js';
import type { UserConfigStore } from '../config/user-config-store.js';
import { CliError } from '../error/cli-error.js';
import type { HarnessRegistry } from '../harness/harness-registry.js';
import { PromptCancelledError } from '../prompt/prompt-cancelled-error.js';
import type { PromptChoice, PromptService } from '../prompt/prompt-service.js';
import { TemplateRepositoryError } from '../template/template-repository-error.js';
import type { AlternateScreen } from '../ui/alternate-screen.js';
import type { BannerRenderer } from '../ui/banner-renderer.js';
import { OutputFormatter } from '../ui/output-formatter.js';

const AVAILABLE_ACTIONS: readonly PromptChoice[] = [
  {
    value: 'init',
    label: 'Apply templates to this project',
    description: 'Generate AI templates in the current directory',
  },
  {
    value: 'sync',
    label: 'Update templates in this project',
    description: 'Update managed files in this project from the template repository',
  },
  {
    value: 'new',
    label: 'Create a template repository',
    description: 'Scaffold a new AGKIT template repository in the current directory',
  },
  {
    value: 'config',
    label: 'Configuration',
    description: 'Set or update the Git repository URL and default branch/tag',
  },
  {
    value: 'exit',
    label: 'Exit',
    description: 'Close agkit',
  },
];

export class InteractiveRunner {
  private readonly configStore: UserConfigStore;
  private readonly configCommand: ConfigCommand;
  private readonly listCommand: ListCommand;
  private readonly harnessRegistry: HarnessRegistry;
  private readonly promptService: PromptService;
  private readonly initCommand: InitCommand;
  private readonly syncCommand: SyncCommand;
  private readonly outputFormatter: OutputFormatter;
  private readonly newCommand: NewCommand;
  private readonly bannerRenderer: BannerRenderer | undefined;
  private readonly screen: AlternateScreen | undefined;

  constructor(
    configStore: UserConfigStore,
    configCommand: ConfigCommand,
    listCommand: ListCommand,
    harnessRegistry: HarnessRegistry,
    promptService: PromptService,
    initCommand: InitCommand,
    syncCommand: SyncCommand,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
    newCommand: NewCommand = new NewCommand(harnessRegistry, outputFormatter),
    bannerRenderer?: BannerRenderer,
    screen?: AlternateScreen,
  ) {
    this.configStore = configStore;
    this.configCommand = configCommand;
    this.listCommand = listCommand;
    this.harnessRegistry = harnessRegistry;
    this.promptService = promptService;
    this.initCommand = initCommand;
    this.syncCommand = syncCommand;
    this.outputFormatter = outputFormatter;
    this.newCommand = newCommand;
    this.bannerRenderer = bannerRenderer;
    this.screen = screen;
  }

  async run(targetDir: string): Promise<void> {
    let noticeLines: readonly string[] = [];
    let config = await this.configStore.load();

    while (config === undefined) {
      this.renderFrame(undefined, targetDir, noticeLines);
      try {
        const configOutcome = await this.runConfiguration(undefined, targetDir);
        config = configOutcome.config;
        noticeLines = configOutcome.lines;
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          return;
        }
        if (error instanceof CliError) {
          noticeLines = [this.outputFormatter.formatError(error.message)];
          continue;
        }
        throw error;
      }
    }

    while (true) {
      this.renderFrame(config, targetDir, noticeLines);

      let action: string;
      try {
        action = await this.promptService.selectAction(AVAILABLE_ACTIONS);
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          return;
        }
        throw error;
      }

      if (action === 'exit') {
        return;
      }

      noticeLines = [];

      try {
        if (action === 'init') {
          noticeLines = await this.runInit(config, targetDir);
          continue;
        }

        if (action === 'sync') {
          noticeLines = await this.runSync(targetDir);
          continue;
        }

        if (action === 'new') {
          noticeLines = await this.runNew(targetDir);
          continue;
        }

        if (action === 'config') {
          const configOutcome = await this.runConfiguration(config, targetDir);
          config = configOutcome.config;
          noticeLines = configOutcome.lines;
          continue;
        }

        throw new Error(`Unsupported interactive action "${action}".`);
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          noticeLines = [];
          continue;
        }
        if (error instanceof CliError) {
          noticeLines = [this.outputFormatter.formatError(error.message)];
          continue;
        }
        throw error;
      }
    }
  }

  private renderFrame(
    config: UserConfig | undefined,
    targetDir: string,
    noticeLines: readonly string[],
  ): void {
    this.screen?.clear();
    this.bannerRenderer?.render({
      repoUrl: config?.git_repository_url,
      ref: config?.default_ref,
      cwd: targetDir,
    });
    if (noticeLines.length > 0) {
      this.screen?.writeLines(noticeLines);
    }
  }

  private async runInit(
    config: UserConfig,
    targetDir: string,
  ): Promise<readonly string[]> {
    const { modules } = await this.listCommand.execute();
    if (modules.length === 0) {
      throw new TemplateRepositoryError(
        'No template modules found in the configured repository.',
      );
    }

    const moduleChoices: readonly PromptChoice[] = modules.map((mod) => ({
      value: mod.id,
      label: `${mod.displayName} (${mod.id})`,
      description: mod.description,
    }));
    const harnessChoices: readonly PromptChoice[] = this.harnessRegistry
      .listAll()
      .map((harness) => ({
        value: harness.name,
        label: harness.displayName,
      }));

    while (true) {
      const moduleIds = await this.promptService.selectModules(moduleChoices);

      let harnessName: string;
      try {
        harnessName = await this.promptService.selectHarness(harnessChoices);
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          this.renderFrame(config, targetDir, []);
          continue;
        }
        throw error;
      }

      const result = await this.initCommand.execute({
        targetDir,
        harnessName,
        moduleIds,
      });

      return this.outputFormatter.formatInitSummary(result);
    }
  }

  private async runNew(targetDir: string): Promise<readonly string[]> {
    const harnessChoices: readonly PromptChoice[] = this.harnessRegistry
      .listAll()
      .map((harness) => ({
        value: harness.name,
        label: harness.displayName,
      }));
    const harnessName = await this.promptService.selectHarness(harnessChoices);
    const result = await this.newCommand.execute({
      targetDir,
      harnessName,
    });

    return this.outputFormatter.formatNewSummary(result);
  }

  private async runSync(targetDir: string): Promise<readonly string[]> {
    const result = await this.syncCommand.execute({
      targetDir,
      resolveConflict: (conflict) => this.promptService.resolveConflict(conflict),
    });

    return this.outputFormatter.formatSyncSummary(result);
  }

  private async runConfiguration(
    currentConfig: UserConfig | undefined,
    targetDir: string,
  ): Promise<{ readonly config: UserConfig; readonly lines: readonly string[] }> {
    let gitRepositoryUrl = currentConfig?.git_repository_url;
    let defaultRef = currentConfig?.default_ref;

    while (true) {
      gitRepositoryUrl = await this.promptService.inputRepoUrl(gitRepositoryUrl);

      try {
        defaultRef = await this.promptService.inputDefaultRef(defaultRef);
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          this.renderFrame(currentConfig, targetDir, []);
          continue;
        }
        throw error;
      }

      const result = await this.configCommand.execute({
        git_repository_url: gitRepositoryUrl,
        default_ref: defaultRef,
      });

      return {
        config: result.config,
        lines: this.outputFormatter.formatConfigSummary(result),
      };
    }
  }
}
