import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject } from '../../../src/command/init/init.js';
import { agyHarness } from '../../../src/harness/agy/agy-harness.js';
import { opencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';

describe('initProject', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-init-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes SKILL.md into the OpenCode skills directory by default', async () => {
    const result = await initProject({ targetDir: tempDir });
    const expectedRelative = join('.opencode', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });

  it('writes SKILL.md into the Antigravity skills directory when using agyHarness', async () => {
    const result = await initProject({
      targetDir: tempDir,
      harness: agyHarness,
    });
    const expectedRelative = join('.agents', 'skills', 'example', 'SKILL.md');

    expect(result.writtenFiles).toEqual([expectedRelative]);

    const content = await readFile(join(tempDir, expectedRelative), 'utf8');
    expect(content).toContain('name: example');
  });

  it('exposes the expected skill paths on opencodeHarness and agyHarness', () => {
    expect(opencodeHarness.name).toBe('opencode');
    expect(opencodeHarness.skills.relativePath('my-skill')).toBe(
      join('.opencode', 'skills', 'my-skill', 'SKILL.md'),
    );

    expect(agyHarness.name).toBe('agy');
    expect(agyHarness.skills.relativePath('my-skill')).toBe(
      join('.agents', 'skills', 'my-skill', 'SKILL.md'),
    );
  });
});
