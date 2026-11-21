import { CliError } from '../error/cli-error.js';

export class GitCommandError extends CliError {
  readonly operation: string;

  constructor(operation: string, detail: string, options?: ErrorOptions) {
    super(`Git ${operation} failed: ${detail}`, 1, options);
    this.name = 'GitCommandError';
    this.operation = operation;
  }
}
