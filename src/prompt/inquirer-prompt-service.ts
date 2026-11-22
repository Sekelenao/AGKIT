import { ExitPromptError } from '@inquirer/core';
import { input } from '@inquirer/prompts';
import type { ConflictResolution } from '../command/sync/sync-command.js';
import { THEME_SYMBOLS, UiTheme } from '../ui/ui-theme.js';
import { PromptCancelledError } from './prompt-cancelled-error.js';
import type { DocumentViewOptions, PromptChoice, PromptService } from './prompt-service.js';
import { railCheckbox } from './rail-checkbox.js';
import { railDocumentPager } from './rail-document-pager.js';
import { railSelect } from './rail-select.js';

const theme = new UiTheme(true);

const RAIL_INPUT_THEME = {
  prefix: {
    idle: `${theme.accent(THEME_SYMBOLS.active)} `,
    done: `${theme.success(THEME_SYMBOLS.done)} `,
  },
  style: {
    message: (text: string): string => theme.brightBold(text),
    answer: (text: string): string => theme.accent(text),
    error: (text: string): string => `${theme.errorBold(THEME_SYMBOLS.error)} ${theme.error(text)}`,
    defaultAnswer: (text: string): string => theme.dim(`(${text})`),
  },
};

export class InquirerPromptService implements PromptService {
  async selectAction(choices: readonly PromptChoice[]): Promise<string> {
    return this.wrapCancel(() =>
      railSelect<string>({
        message: 'What would you like to do?',
        choices,
      }),
    );
  }

  async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
    return this.wrapCancel(() =>
      railSelect<string>({
        message: 'Select target AI harness',
        choices,
      }),
    );
  }

  async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
    return this.wrapCancel(() =>
      railCheckbox<string>({
        message: 'Select template module(s)',
        required: true,
        choices,
      }),
    );
  }

  async resolveConflict(filePath: string): Promise<ConflictResolution> {
    return this.wrapCancel(() =>
      railSelect<ConflictResolution>({
        message: `Conflict detected on "${filePath}". How should it be resolved?`,
        tone: 'warning',
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
      input({
        message: 'Template Git repository URL',
        default: currentUrl,
        theme: RAIL_INPUT_THEME,
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
        theme: RAIL_INPUT_THEME,
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
