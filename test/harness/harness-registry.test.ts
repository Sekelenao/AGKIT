import { describe, expect, it } from 'vitest';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../src/harness/unknown-harness-error.js';

describe('HarnessRegistry', () => {
  const registry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);

  it('lists canonical harness names only', () => {
    expect(registry.listNames()).toEqual(['opencode', 'antigravity']);
  });

  it('resolves registered harnesses by canonical name case-insensitively', () => {
    expect(registry.resolve('opencode')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve('OPENCODE')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve(' antigravity ')).toBeInstanceOf(AntigravityHarness);
  });

  it('resolves registered harnesses by alias', () => {
    expect(registry.resolve('agy')).toBeInstanceOf(AntigravityHarness);
    expect(registry.resolve('AGY')).toBeInstanceOf(AntigravityHarness);
  });

  it.each(['', '   ', 'unknown', 'cursor'])(
    'throws UnknownHarnessError for unsupported harness "%s"',
    (invalidName) => {
      expect(() => registry.resolve(invalidName)).toThrow(UnknownHarnessError);
    },
  );
});
