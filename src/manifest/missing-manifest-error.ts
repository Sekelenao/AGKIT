import { CliError } from '../error/cli-error.js';

export class MissingManifestError extends CliError {
  constructor(message = 'No .agkit.json found in this project.') {
    super(message, 1);
    this.name = 'MissingManifestError';
  }
}
