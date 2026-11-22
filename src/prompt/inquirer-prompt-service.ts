import { ExitPromptError } from '@inquirer/core';
import type { ConflictResolution } from '../command/sync/sync-command.js';
import { PROMPT_CANCELLED, PromptCancelledError } from './prompt-cancelled-error.js';
import type { DocumentViewOptions, PromptChoice, PromptService } from './prompt-service.js';
import { railCheckbox } from './rail-checkbox.js';
import { railDocumentPager } from './rail-document-pager.js';
import { railInput } from './rail-input.js';
import { railSelect } from './rail-select.js';

export class InquirerPromptService implements PromptService {
  async selectAction(choices: readonly PromptChoice[]): Promise<string> {
    return this.wrapCancel(() =>
      railSelect<string>({
        message: 'What would you like to do?',
        choices,
        cancelLabel: 'quit',
      }),
    );
  }

  async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
    return this.wrapCancel(() =>
      railSelect<string>({
        message: 'Select target AI harness',
        choices,
        cancelLabel: 'back',
      }),
    );
  }

  async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
    return this.wrapCancel(() =>
      railCheckbox<string>({
        message: 'Select template module(s)',
        required: true,
        choices,
        cancelLabel: 'back',
      }),
    );
  }

  async resolveConflict(filePath: string): Promise<ConflictResolution> {
    return this.wrapCancel(() =>
      railSelect<ConflictResolution>({
        message: `Conflict detected on "${filePath}". How should it be resolved?`,
        tone: 'warning',
        cancelLabel: 'back',
        choices: [
          {
            label: 'Keep local version',
            value: 'keep',
            description: 'Leave your local file untouched',
          },
          {
            label: 'Overwrite with upstream',
            value: 'overwrite',
            description: 'Replace local file with upstream version',
          },
          {
            label: 'Backup local (.bak) and apply upstream',
            value: 'backup',
            description: 'Save local file as .bak before applying upstream',
          },
        ],
      }),
    );
  }

  async inputRepoUrl(currentUrl?: string): Promise<string> {
    return this.wrapCancel(() =>
      railInput({
        message: 'Template Git repository URL',
        default: currentUrl,
        cancelLabel: 'back',
        validate: (value) =>
          value.trim().length > 0 || 'Repository URL cannot be empty.',
      }),
    );
  }

  async inputDefaultRef(currentRef?: string): Promise<string | undefined> {
    const value = await this.wrapCancel(() =>
      railInput({
        message: 'Default branch or tag (leave empty for repository default)',
        default: currentRef,
        cancelLabel: 'back',
      }),
    );
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  async viewDocument(options: DocumentViewOptions): Promise<void> {
    await this.wrapCancel(() =>
      railDocumentPager({
        title: options.title,
        subtitle: options.subtitle,
        lines: options.lines,
      }),
    );
  }

  private async wrapCancel<T>(
    prompt: () => Promise<T | typeof PROMPT_CANCELLED>,
  ): Promise<T> {
    try {
      const result = await prompt();
      if (result === PROMPT_CANCELLED) {
        throw new PromptCancelledError();
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof ExitPromptError) {
        throw new PromptCancelledError({ cause: error });
      }
      throw error;
    }
  }
}
