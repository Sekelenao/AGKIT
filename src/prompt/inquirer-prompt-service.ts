import { ExitPromptError } from '@inquirer/core';
import { checkbox, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { ConflictResolution } from '../command/sync/sync-command.js';
import { PromptCancelledError } from './prompt-cancelled-error.js';
import type { PromptChoice, PromptService } from './prompt-service.js';

const CURSOR_SYMBOL = '❯';
const unselectedGray = chalk.hex('#808080');
const descriptionGray = chalk.hex('#808080');
const [GRAY_OPEN = '', GRAY_CLOSE = ''] = unselectedGray('\0').split('\0');

function stripUnselectedGray(text: string): string {
  if (GRAY_OPEN.length === 0) {
    return text;
  }
  return text.split(GRAY_OPEN).join('').split(GRAY_CLOSE).join('');
}

const BASE_PROMPT_THEME = {
  prefix: {
    idle: chalk.yellow('?'),
    done: chalk.green('✔'),
  },
  style: {
    highlight: (text: string): string => {
      const cleaned = stripUnselectedGray(text);
      if (cleaned.startsWith(CURSOR_SYMBOL)) {
        return `${chalk.yellow(CURSOR_SYMBOL)}${chalk.whiteBright(cleaned.slice(CURSOR_SYMBOL.length))}`;
      }
      return chalk.whiteBright(cleaned);
    },
    answer: (text: string): string => chalk.yellow(text),
    key: (text: string): string => chalk.yellow.bold(`<${text}>`),
  },
};

const LIST_PROMPT_THEME = {
  ...BASE_PROMPT_THEME,
  icon: {
    cursor: CURSOR_SYMBOL,
  },
  style: {
    ...BASE_PROMPT_THEME.style,
    description: (text: string): string => descriptionGray(text),
  },
};

export class InquirerPromptService implements PromptService {
  async selectAction(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('', choices, { ...LIST_PROMPT_THEME, prefix: '' });
  }

  async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('Select target AI harness', choices);
  }

  async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
    return this.wrapCancel(() =>
      checkbox({
        message: 'Select template module(s)',
        required: true,
        theme: LIST_PROMPT_THEME,
        choices: choices.map((choice) => ({
          name: unselectedGray(choice.label),
          short: choice.label,
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
        theme: LIST_PROMPT_THEME,
        choices: [
          {
            name: unselectedGray('Keep local version'),
            short: 'Keep local version',
            value: 'keep',
            description: 'Leave your local file untouched',
          },
          {
            name: unselectedGray('Overwrite with upstream'),
            short: 'Overwrite with upstream',
            value: 'overwrite',
            description: 'Replace local file with upstream version',
          },
          {
            name: unselectedGray('Backup local (.bak) and apply upstream'),
            short: 'Backup local (.bak) and apply upstream',
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
        theme: BASE_PROMPT_THEME,
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
        theme: BASE_PROMPT_THEME,
      }),
    );
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async runSelect(
    message: string,
    choices: readonly PromptChoice[],
    theme: {
      readonly prefix: string | { readonly idle: string; readonly done: string };
      readonly icon: typeof LIST_PROMPT_THEME.icon;
      readonly style: typeof LIST_PROMPT_THEME.style;
    } = LIST_PROMPT_THEME,
  ): Promise<string> {
    return this.wrapCancel(() =>
      select({
        message,
        theme,
        choices: choices.map((choice) => ({
          name: unselectedGray(choice.label),
          short: choice.label,
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
