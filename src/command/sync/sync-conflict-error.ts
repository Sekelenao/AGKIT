import { CliError } from '../../error/cli-error.js';

export class SyncConflictError extends CliError {
  readonly conflictFiles: readonly string[];

  constructor(conflictFiles: readonly string[]) {
    super(
      `Sync completed with ${conflictFiles.length} conflict(s) kept locally: ${conflictFiles.join(', ')}. Re-run with --force to overwrite.`,
      1,
    );
    this.name = 'SyncConflictError';
    this.conflictFiles = conflictFiles;
  }
}
