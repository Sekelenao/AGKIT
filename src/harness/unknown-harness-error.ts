import { CliError } from '../error/cli-error.js';

export class UnknownHarnessError extends CliError {
  readonly harnessName: string;
  readonly availableHarnesses: readonly string[];

  constructor(harnessName: string, availableHarnesses: readonly string[]) {
    super(
      `Unknown harness "${harnessName}". Available harnesses: ${availableHarnesses.join(', ')}.`,
    );
    this.name = 'UnknownHarnessError';
    this.harnessName = harnessName;
    this.availableHarnesses = availableHarnesses;
  }
}
