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

  it('writes SKILL.md with generated frontmatter and nested companion files under the skill directory', async () => {
    const handler = new DirectorySkillHandler(join('.opencode', 'skills'));

    const written = await handler.write(tempDir, {
      name: 'flink-streaming',
      description: 'Streaming conventions for Flink jobs',
      instructions: '# Flink Streaming\n',
      companionFiles: [
        { relativePath: 'references/checklist.md', content: '- Check parallelism\n' },
        { relativePath: 'scripts/check.sh', content: '#!/bin/sh\necho ok\n' },
      ],
    });

    expect(written.map((file) => file.relativePath)).toEqual([
      join('.opencode', 'skills', 'flink-streaming', 'SKILL.md'),
      join('.opencode', 'skills', 'flink-streaming', 'references', 'checklist.md'),
      join('.opencode', 'skills', 'flink-streaming', 'scripts', 'check.sh'),
    ]);

    await expect(
      readFile(join(tempDir, written[0]?.relativePath ?? ''), 'utf8'),
    ).resolves.toBe(
      '---\nname: flink-streaming\ndescription: "Streaming conventions for Flink jobs"\n---\n\n# Flink Streaming\n',
    );
    await expect(
      readFile(join(tempDir, written[1]?.relativePath ?? ''), 'utf8'),
    ).resolves.toBe('- Check parallelism\n');
    await expect(
      readFile(join(tempDir, written[2]?.relativePath ?? ''), 'utf8'),
    ).resolves.toBe('#!/bin/sh\necho ok\n');
  });
});
