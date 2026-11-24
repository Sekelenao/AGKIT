import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CursorHarness } from '../../../src/harness/cursor/cursor-harness.js';

describe('CursorHarness agent rendering', () => {
  const handler = new CursorHarness().agents;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-cursor-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('adds readonly: true when edit capability is absent', async () => {

    const written = await handler.writeAll(tempDir, [
      {
        name: 'reviewer',
        displayName: 'Reviewer',
        description: 'Reviews diffs',
        capabilities: ['read', 'execute'],
        prompt: '# Reviewer',
      },
    ]);

    const expectedPath = join('.cursor', 'agents', 'reviewer.md');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        '---',
        'name: reviewer',
        'description: "Reviews diffs"',
        'readonly: true',
        '---',
        '',
        '# Reviewer',
        '',
      ].join('\n'),
    );
  });

  it('omits readonly when edit capability is present', () => {
    const rendered = handler.render([
      {
        name: 'editor',
        displayName: 'Editor',
        description: 'Edits code',
        capabilities: ['read', 'edit'],
        prompt: '# Editor',
      },
    ]);

    expect(rendered[0]?.content).not.toContain('readonly:');
  });
});
