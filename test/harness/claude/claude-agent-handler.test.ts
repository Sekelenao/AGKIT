import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeHarness } from '../../../src/harness/claude/claude-harness.js';

describe('ClaudeHarness agent rendering', () => {
  const handler = new ClaudeHarness().agents;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-claude-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('maps omitted capabilities to disallowedTools and renders bare skill IDs', async () => {

    const written = await handler.writeAll(tempDir, [
      {
        name: 'pr-reviewer',
        displayName: 'PR Reviewer',
        description: 'Reviews pull requests',
        capabilities: ['read', 'skill', 'subagent'],
        skills: ['properties', 'nullability'],
        prompt: '# PR Reviewer',
      },
    ]);

    const expectedPath = join('.claude', 'agents', 'pr-reviewer.md');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        '---',
        'name: pr-reviewer',
        'description: "Reviews pull requests"',
        'disallowedTools:',
        '  - Edit',
        '  - Write',
        '  - Bash',
        'skills:',
        '  - properties',
        '  - nullability',
        '---',
        '',
        '# PR Reviewer',
        '',
      ].join('\n'),
    );
  });

  it('omits disallowedTools when all capabilities are granted', () => {
    const rendered = handler.render([
      {
        name: 'builder',
        displayName: 'Builder',
        description: 'Builds features',
        capabilities: ['read', 'edit', 'execute', 'skill', 'subagent'],
        prompt: '# Builder',
      },
    ]);

    expect(rendered[0]?.content).not.toContain('disallowedTools:');
    expect(rendered[0]?.content).not.toContain('tools:');
  });
});
