import type { ConfigCommand } from '../command/config/config-command.js';
import type { InitCommand } from '../command/init/init-command.js';
import type { ListCommand } from '../command/list/list-command.js';
import { SpecCommand } from '../command/spec/spec-command.js';
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
import { DocumentViewer } from '../ui/document-viewer.js';
import { OutputFormatter } from '../ui/output-formatter.js';

const AVAILABLE_ACTIONS: readonly PromptChoice[] = [
  {
    value: 'init',
    label: 'Initialize a project',
    description: 'Generate AI templates in the current directory',
  },
  {
    value: 'sync',
    label: 'Synchronize templates',
    description: 'Update managed files in this project from the template repository',
  },
  {
    value: 'config',
    label: 'Configure template repository',
    description: 'Set or update the Git repository URL and default branch/tag',
  },
  {
    value: 'spec',
    label: 'View template specification',
    description: 'Browse the template repository layout and JSON schemas',
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
  private readonly specCommand: SpecCommand;
  private readonly documentViewer: DocumentViewer;
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
    specCommand: SpecCommand = new SpecCommand(),
    documentViewer: DocumentViewer = new DocumentViewer(promptService, outputFormatter),
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
    this.specCommand = specCommand;
    this.documentViewer = documentViewer;
    this.bannerRenderer = bannerRenderer;
    this.screen = screen;
  }

  async run(targetDir: string): Promise<readonly string[]> {
    const summaryLines: string[] = [];
    let noticeLines: readonly string[] = [];
    let config = await this.configStore.load();

    while (config === undefined) {
      this.renderFrame(undefined, targetDir, noticeLines);
      try {
        const configOutcome = await this.runConfiguration(
          undefined,
          targetDir,
          summaryLines,
        );
        config = configOutcome.config;
        noticeLines = configOutcome.lines;
      } catch (error: unknown) {
        if (error instanceof PromptCancelledError) {
          return summaryLines;
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
          return summaryLines;
        }
        throw error;
      }

      if (action === 'exit') {
        return summaryLines;
      }

      noticeLines = [];

      try {
        if (action === 'init') {
          noticeLines = await this.runInit(config, targetDir, summaryLines);
          continue;
        }

        if (action === 'sync') {
          noticeLines = await this.runSync(targetDir, summaryLines);
          continue;
        }

        if (action === 'config') {
          const configOutcome = await this.runConfiguration(
            config,
            targetDir,
            summaryLines,
          );
          config = configOutcome.config;
          noticeLines = configOutcome.lines;
          continue;
        }

        if (action === 'spec') {
          this.renderFrame(config, targetDir, []);
          const content = await this.specCommand.execute();
          await this.documentViewer.showMarkdown(
            'Template Repository Specification',
            content,
            'docs/template-repository.md',
          );
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
    summaryLines: string[],
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

      const formatted = this.outputFormatter.formatInitSummary(result);
      summaryLines.push(...formatted);
      return formatted;
    }
  }

  private async runSync(
    targetDir: string,
    summaryLines: string[],
  ): Promise<readonly string[]> {
    const result = await this.syncCommand.execute({
      targetDir,
      resolveConflict: (filePath) => this.promptService.resolveConflict(filePath),
    });

    const formatted = this.outputFormatter.formatSyncSummary(result);
    summaryLines.push(...formatted);
    return formatted;
  }

  private async runConfiguration(
    currentConfig: UserConfig | undefined,
    targetDir: string,
    summaryLines: string[],
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

      const formatted = this.outputFormatter.formatConfigSummary(result);
      summaryLines.push(...formatted);
      return {
        config: result.config,
        lines: formatted,
      };
    }
  }
}
