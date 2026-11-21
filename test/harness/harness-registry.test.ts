import { describe, expect, it } from 'vitest';
import { AgyHarness } from '../../src/harness/agy/agy-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../src/harness/unknown-harness-error.js';

describe('HarnessRegistry', () => {
  const registry = new HarnessRegistry([
    new OpencodeHarness(),
    new AgyHarness(),
  ]);

  it('lists all registered harness names', () => {
    expect(registry.listNames()).toEqual(['opencode', 'agy']);
  });

  it('resolves registered harnesses case-insensitively', () => {
    expect(registry.resolve('opencode')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve('OPENCODE')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve(' agy ')).toBeInstanceOf(AgyHarness);
  });

  it.each(['', '   ', 'unknown', 'cursor'])(
    'throws UnknownHarnessError for unsupported harness "%s"',
    (invalidName) => {
      expect(() => registry.resolve(invalidName)).toThrow(UnknownHarnessError);
    },
  );
});
