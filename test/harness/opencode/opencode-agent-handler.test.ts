import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';

describe('OpencodeHarness agent rendering', () => {
  const handler = new OpencodeHarness().agents;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-opencode-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('renders mode and denied permissions for omitted capabilities', async () => {

    const written = await handler.writeAll(tempDir, [
      {
        name: 'reviewer',
        displayName: 'Reviewer',
        description: 'Reviews code read-only',
        mode: 'subagent',
        capabilities: ['read', 'skill'],
        prompt: '# Reviewer',
      },
    ]);

    const expectedPath = join('.opencode', 'agents', 'reviewer.md');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        '---',
        'name: reviewer',
        'description: "Reviews code read-only"',
        'mode: subagent',
        'permission:',
        '  edit: deny',
        '  bash: deny',
        '  task: deny',
        '---',
        '',
        '# Reviewer',
        '',
      ].join('\n'),
    );
  });

  it('omits permission block when all capabilities are granted', () => {
    const rendered = handler.render([
      {
        name: 'builder',
        displayName: 'Builder',
        description: 'Builds features',
        capabilities: ['read', 'edit', 'execute', 'skill', 'subagent'],
        prompt: '# Builder',
      },
    ]);

    expect(rendered[0]?.content).not.toContain('permission:');
    expect(rendered[0]?.content).not.toContain('mode:');
  });
});
