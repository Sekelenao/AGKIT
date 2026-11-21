import { CliError } from '../error/cli-error.js';

export class PromptCancelledError extends CliError {
  constructor(options?: ErrorOptions) {
    super('Cancelled.', 130, options);
    this.name = 'PromptCancelledError';
  }
}
