import { CliError } from '../error/cli-error.js';

export class InvalidConfigError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 1, options);
    this.name = 'InvalidConfigError';
  }
}
