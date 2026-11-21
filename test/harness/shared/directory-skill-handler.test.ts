import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DirectorySkillHandler } from '../../../src/harness/shared/directory-skill-handler.js';

describe('DirectorySkillHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-skill-handler-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes SKILL.md and nested companion files under the skill directory', async () => {
    const handler = new DirectorySkillHandler(join('.opencode', 'skills'));

    const writtenPaths = await handler.write(tempDir, 'flink-streaming', [
      { relativePath: 'SKILL.md', content: '# Flink Streaming\n' },
      { relativePath: 'references/checklist.md', content: '- Check parallelism\n' },
      { relativePath: 'scripts/check.sh', content: '#!/bin/sh\necho ok\n' },
    ]);

    expect(writtenPaths).toEqual([
      join('.opencode', 'skills', 'flink-streaming', 'SKILL.md'),
      join('.opencode', 'skills', 'flink-streaming', 'references', 'checklist.md'),
      join('.opencode', 'skills', 'flink-streaming', 'scripts', 'check.sh'),
    ]);

    await expect(readFile(join(tempDir, writtenPaths[0] ?? ''), 'utf8')).resolves.toBe(
      '# Flink Streaming\n',
    );
    await expect(readFile(join(tempDir, writtenPaths[1] ?? ''), 'utf8')).resolves.toBe(
      '- Check parallelism\n',
    );
    await expect(readFile(join(tempDir, writtenPaths[2] ?? ''), 'utf8')).resolves.toBe(
      '#!/bin/sh\necho ok\n',
    );
  });
});
