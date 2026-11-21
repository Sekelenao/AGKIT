import type { InitCommand, InitResult } from '../command/init/init-command.js';
import type { HarnessRegistry } from '../harness/harness-registry.js';
import type { PromptChoice, PromptService } from '../prompt/prompt-service.js';

const AVAILABLE_ACTIONS: readonly PromptChoice[] = [
  {
    value: 'init',
    label: 'Initialize a project',
    description: 'Generate AI templates in the current directory',
  },
];

export class InteractiveRunner {
  private readonly harnessRegistry: HarnessRegistry;
  private readonly promptService: PromptService;
  private readonly initCommand: InitCommand;

  constructor(
    harnessRegistry: HarnessRegistry,
    promptService: PromptService,
    initCommand: InitCommand,
  ) {
    this.harnessRegistry = harnessRegistry;
    this.promptService = promptService;
    this.initCommand = initCommand;
  }

  async run(targetDir: string): Promise<InitResult> {
    const action = await this.promptService.selectAction(AVAILABLE_ACTIONS);

    if (action === 'init') {
      const harnessChoices: readonly PromptChoice[] = this.harnessRegistry
        .listAll()
        .map((harness) => ({
          value: harness.name,
          label: harness.displayName,
        }));
      const harnessName = await this.promptService.selectHarness(harnessChoices);
      return this.initCommand.execute({ targetDir, harnessName });
    }

    throw new Error(`Unsupported interactive action "${action}".`);
  }
}
