import type { Harness } from './harness.js';
import { UnknownHarnessError } from './unknown-harness-error.js';

export class HarnessRegistry {
  private readonly canonicalNames: readonly string[];
  private readonly harnessesByKey: ReadonlyMap<string, Harness>;

  constructor(harnesses: readonly Harness[]) {
    this.canonicalNames = harnesses.map((harness) => harness.name);

    const entries = new Map<string, Harness>();
    for (const harness of harnesses) {
      entries.set(harness.name.toLowerCase(), harness);
      for (const alias of harness.aliases) {
        entries.set(alias.toLowerCase(), harness);
      }
    }
    this.harnessesByKey = entries;
  }

  listNames(): readonly string[] {
    return this.canonicalNames;
  }

  resolve(name: string): Harness {
    const normalized = name.trim().toLowerCase();
    const harness = this.harnessesByKey.get(normalized);

    if (harness === undefined) {
      throw new UnknownHarnessError(name, this.listNames());
    }

    return harness;
  }
}
