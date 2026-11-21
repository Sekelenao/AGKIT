import { CliError } from '../error/cli-error.js';

export class MissingConfigError extends CliError {
  constructor(
    message = 'No template repository is configured yet. Run "agkit config --repo <url>" first.',
  ) {
    super(message, 1);
    this.name = 'MissingConfigError';
  }
}
