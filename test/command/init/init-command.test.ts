import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitCommand } from '../../../src/command/init/init-command.js';
import { AntigravityHarness } from '../../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../../src/harness/unknown-harness-error.js';

describe('InitCommand', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);
  const command = new InitCommand(harnessRegistry);
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-init-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes SKILL.md into the OpenCode skills directory', async () => {
    const result = await command.execute({
      targetDir: tempDir,
      harnessName: 'opencode',
    });
    const expectedRelative = join('.opencode', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });

  it('writes SKILL.md into the Antigravity skills directory via alias', async () => {
    const result = await command.execute({
      targetDir: tempDir,
      harnessName: 'agy',
    });
    const expectedRelative = join('.agents', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });

  it('throws UnknownHarnessError when harnessName is invalid', async () => {
    await expect(
      command.execute({ targetDir: tempDir, harnessName: 'unknown' }),
    ).rejects.toThrow(UnknownHarnessError);
  });
});
