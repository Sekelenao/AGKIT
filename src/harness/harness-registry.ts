import type { Harness } from './harness.js';
import { UnknownHarnessError } from './unknown-harness-error.js';

export class HarnessRegistry {
  private readonly registeredHarnesses: readonly Harness[];
  private readonly harnessesByKey: ReadonlyMap<string, Harness>;

  constructor(harnesses: readonly Harness[]) {
    this.registeredHarnesses = [...harnesses];

    const entries = new Map<string, Harness>();
    for (const harness of harnesses) {
      entries.set(harness.name.toLowerCase(), harness);
      for (const alias of harness.aliases) {
        entries.set(alias.toLowerCase(), harness);
      }
    }
    this.harnessesByKey = entries;
  }

  listAll(): readonly Harness[] {
    return this.registeredHarnesses;
  }

  listNames(): readonly string[] {
    return this.registeredHarnesses.map((harness) => harness.name);
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
