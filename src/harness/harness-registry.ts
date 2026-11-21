import type { Harness } from './harness.js';
import { UnknownHarnessError } from './unknown-harness-error.js';

export class HarnessRegistry {
  private readonly harnesses: ReadonlyMap<string, Harness>;

  constructor(harnesses: readonly Harness[]) {
    this.harnesses = new Map(
      harnesses.map((harness) => [harness.name.toLowerCase(), harness]),
    );
  }

  listNames(): readonly string[] {
    return [...this.harnesses.keys()];
  }

  resolve(name: string): Harness {
    const normalized = name.trim().toLowerCase();
    const harness = this.harnesses.get(normalized);

    if (harness === undefined) {
      throw new UnknownHarnessError(name, this.listNames());
    }

    return harness;
  }
}
