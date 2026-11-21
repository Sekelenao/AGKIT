import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitCommand } from '../../src/command/init/init-command.js';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { InteractiveRunner } from '../../src/interactive/interactive-runner.js';
import type { PromptChoice, PromptService } from '../../src/prompt/prompt-service.js';

describe('InteractiveRunner', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);
  const initCommand = new InitCommand(harnessRegistry);
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-interactive-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('presents human-readable choices and delegates selected harness to InitCommand', async () => {
    let capturedActions: readonly PromptChoice[] = [];
    let capturedHarnesses: readonly PromptChoice[] = [];

    const stubPrompt: PromptService = {
      async selectAction(choices: readonly PromptChoice[]): Promise<string> {
        capturedActions = choices;
        return 'init';
      },
      async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
        capturedHarnesses = choices;
        return 'antigravity';
      },
    };
    const runner = new InteractiveRunner(harnessRegistry, stubPrompt, initCommand);

    const result = await runner.run(tempDir);
    const expectedRelative = join('.agents', 'skills', 'example', 'SKILL.md');

    expect(capturedActions.map((c) => c.label)).toEqual(['Initialize a project']);
    expect(capturedHarnesses.map((c) => c.label)).toEqual([
      'OpenCode',
      'Antigravity',
    ]);
    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });
});
