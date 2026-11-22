import { describe, expect, it } from 'vitest';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { BobHarness } from '../../src/harness/bob/bob-harness.js';
import { ClaudeHarness } from '../../src/harness/claude/claude-harness.js';
import { CodexHarness } from '../../src/harness/codex/codex-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../src/harness/unknown-harness-error.js';

describe('HarnessRegistry', () => {
  const registry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
    new ClaudeHarness(),
    new CodexHarness(),
    new BobHarness(),
  ]);

  it('lists canonical harness names only', () => {
    expect(registry.listNames()).toEqual([
      'opencode',
      'antigravity',
      'claude',
      'codex',
      'bob',
    ]);
  });

  it('resolves registered harnesses by canonical name case-insensitively', () => {
    expect(registry.resolve('opencode')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve('OPENCODE')).toBeInstanceOf(OpencodeHarness);
    expect(registry.resolve(' antigravity ')).toBeInstanceOf(AntigravityHarness);
    expect(registry.resolve('claude')).toBeInstanceOf(ClaudeHarness);
    expect(registry.resolve('codex')).toBeInstanceOf(CodexHarness);
    expect(registry.resolve('bob')).toBeInstanceOf(BobHarness);
  });

  it('resolves registered harnesses by alias', () => {
    expect(registry.resolve('agy')).toBeInstanceOf(AntigravityHarness);
    expect(registry.resolve('AGY')).toBeInstanceOf(AntigravityHarness);
    expect(registry.resolve('claude-code')).toBeInstanceOf(ClaudeHarness);
    expect(registry.resolve('openai-codex')).toBeInstanceOf(CodexHarness);
    expect(registry.resolve('ibm-bob')).toBeInstanceOf(BobHarness);
  });

  it.each(['', '   ', 'unknown', 'cursor'])(
    'throws UnknownHarnessError for unsupported harness "%s"',
    (invalidName) => {
      expect(() => registry.resolve(invalidName)).toThrow(UnknownHarnessError);
    },
  );
});
