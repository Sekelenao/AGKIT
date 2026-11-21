import type { ConfigCommand } from '../command/config/config-command.js';
import type { InitCommand } from '../command/init/init-command.js';
import type { UserConfig } from '../config/user-config.js';
import type { UserConfigStore } from '../config/user-config-store.js';
import type { HarnessRegistry } from '../harness/harness-registry.js';
import type { PromptChoice, PromptService } from '../prompt/prompt-service.js';

const AVAILABLE_ACTIONS: readonly PromptChoice[] = [
  {
    value: 'init',
    label: 'Initialize a project',
    description: 'Generate AI templates in the current directory',
  },
  {
    value: 'config',
    label: 'Configure template repository',
    description: 'Set or update the Git repository URL and default branch/tag',
  },
];

export class InteractiveRunner {
  private readonly configStore: UserConfigStore;
  private readonly configCommand: ConfigCommand;
  private readonly harnessRegistry: HarnessRegistry;
  private readonly promptService: PromptService;
  private readonly initCommand: InitCommand;

  constructor(
    configStore: UserConfigStore,
    configCommand: ConfigCommand,
    harnessRegistry: HarnessRegistry,
    promptService: PromptService,
    initCommand: InitCommand,
  ) {
    this.configStore = configStore;
    this.configCommand = configCommand;
    this.harnessRegistry = harnessRegistry;
    this.promptService = promptService;
    this.initCommand = initCommand;
  }

  async run(targetDir: string): Promise<void> {
    let config = await this.configStore.load();

    if (config === undefined) {
      config = await this.runConfiguration(undefined);
    }

    const action = await this.promptService.selectAction(AVAILABLE_ACTIONS);

    if (action === 'init') {
      const harnessChoices: readonly PromptChoice[] = this.harnessRegistry
        .listAll()
        .map((harness) => ({
          value: harness.name,
          label: harness.displayName,
        }));
      const harnessName = await this.promptService.selectHarness(harnessChoices);
      const result = await this.initCommand.execute({ targetDir, harnessName });

      for (const file of result.writtenFiles) {
        console.log(`Created ${file}`);
      }
      return;
    }

    if (action === 'config') {
      await this.runConfiguration(config);
      return;
    }

    throw new Error(`Unsupported interactive action "${action}".`);
  }

  private async runConfiguration(
    currentConfig: UserConfig | undefined,
  ): Promise<UserConfig> {
    const gitRepositoryUrl = await this.promptService.inputRepoUrl(
      currentConfig?.git_repository_url,
    );
    const defaultRef = await this.promptService.inputDefaultRef(
      currentConfig?.default_ref,
    );

    const result = await this.configCommand.execute({
      git_repository_url: gitRepositoryUrl,
      default_ref: defaultRef,
    });

    console.log(`Configured repository: ${result.config.git_repository_url}`);
    return result.config;
  }
}
