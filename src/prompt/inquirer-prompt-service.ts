import { ExitPromptError } from '@inquirer/core';
import { checkbox, input, select } from '@inquirer/prompts';
import type { ConflictResolution } from '../command/sync/sync-command.js';
import { PromptCancelledError } from './prompt-cancelled-error.js';
import type { PromptChoice, PromptService } from './prompt-service.js';

export class InquirerPromptService implements PromptService {
  async selectAction(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('What would you like to do?', choices);
  }

  async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('Select target AI harness', choices);
  }

  async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
    return this.wrapCancel(() =>
      checkbox({
        message: 'Select template module(s)',
        required: true,
        choices: choices.map((choice) => ({
          name: choice.label,
          value: choice.value,
          ...(choice.description === undefined
            ? {}
            : { description: choice.description }),
        })),
      }),
    );
  }

  async resolveConflict(filePath: string): Promise<ConflictResolution> {
    return this.wrapCancel(() =>
      select<ConflictResolution>({
        message: `Conflict detected on "${filePath}". How should it be resolved?`,
        choices: [
          {
            name: 'Keep local version',
            value: 'keep',
            description: 'Leave your local file untouched',
          },
          {
            name: 'Overwrite with upstream',
            value: 'overwrite',
            description: 'Replace local file with upstream version',
          },
          {
            name: 'Backup local (.bak) and apply upstream',
            value: 'backup',
            description: 'Save local file as .bak before applying upstream',
          },
        ],
      }),
    );
  }

  async inputRepoUrl(currentUrl?: string): Promise<string> {
    return this.wrapCancel(() =>
      input({
        message: 'Template Git repository URL',
        default: currentUrl,
        validate: (value) =>
          value.trim().length > 0 || 'Repository URL cannot be empty.',
      }),
    );
  }

  async inputDefaultRef(currentRef?: string): Promise<string | undefined> {
    const value = await this.wrapCancel(() =>
      input({
        message: 'Default branch or tag (leave empty for repository default)',
        default: currentRef,
      }),
    );
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async runSelect(
    message: string,
    choices: readonly PromptChoice[],
  ): Promise<string> {
    return this.wrapCancel(() =>
      select({
        message,
        choices: choices.map((choice) => ({
          name: choice.label,
          value: choice.value,
          ...(choice.description === undefined
            ? {}
            : { description: choice.description }),
        })),
      }),
    );
  }

  private async wrapCancel<T>(prompt: () => Promise<T>): Promise<T> {
    try {
      return await prompt();
    } catch (error: unknown) {
      if (error instanceof ExitPromptError) {
        throw new PromptCancelledError({ cause: error });
      }
      throw error;
    }
  }
}
