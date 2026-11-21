export class UnknownHarnessError extends Error {
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
