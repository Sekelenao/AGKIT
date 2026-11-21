import { CliError } from '../error/cli-error.js';

export class TemplateRepositoryError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 1, options);
    this.name = 'TemplateRepositoryError';
  }
}
