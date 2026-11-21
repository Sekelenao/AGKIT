import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitCommand } from '../../../src/command/init/init.js';
import { AntigravityHarness } from '../../../src/harness/antigravity/antigravity-harness.js';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';

describe('InitCommand', () => {
  const initCommand = new InitCommand();
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-init-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes SKILL.md into the OpenCode skills directory', async () => {
    const result = await initCommand.execute({
      targetDir: tempDir,
      harness: new OpencodeHarness(),
    });
    const expectedRelative = join('.opencode', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });

  it('writes SKILL.md into the Antigravity skills directory', async () => {
    const result = await initCommand.execute({
      targetDir: tempDir,
      harness: new AntigravityHarness(),
    });
    const expectedRelative = join('.agents', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });
});
