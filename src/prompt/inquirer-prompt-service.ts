import { ExitPromptError } from '@inquirer/core';
import { select } from '@inquirer/prompts';
import { PromptCancelledError } from './prompt-cancelled-error.js';
import type { PromptChoice, PromptService } from './prompt-service.js';

export class InquirerPromptService implements PromptService {
  async selectAction(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('What would you like to do?', choices);
  }

  async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
    return this.runSelect('Select target AI harness', choices);
  }

  private async runSelect(
    message: string,
    choices: readonly PromptChoice[],
  ): Promise<string> {
    try {
      return await select({
        message,
        choices: choices.map((choice) => ({
          name: choice.label,
          value: choice.value,
          ...(choice.description === undefined
            ? {}
            : { description: choice.description }),
        })),
      });
    } catch (error: unknown) {
      if (error instanceof ExitPromptError) {
        throw new PromptCancelledError({ cause: error });
      }
      throw error;
    }
  }
}
