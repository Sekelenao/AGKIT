import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CopilotAgentHandler } from '../../../src/harness/copilot/copilot-agent-handler.js';

describe('CopilotAgentHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-copilot-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes .agent.md files with deduplicated Copilot tools mapped from capabilities', async () => {
    const handler = new CopilotAgentHandler();

    const written = await handler.writeAll(tempDir, [
      {
        name: 'auditor',
        displayName: 'Auditor',
        description: 'Audits code',
        capabilities: ['read', 'skill', 'subagent'],
        prompt: '# Auditor',
      },
    ]);

    const expectedPath = join('.github', 'agents', 'auditor.agent.md');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        '---',
        'name: auditor',
        'description: "Audits code"',
        'tools:',
        '  - read',
        '  - search',
        '  - agent',
        '---',
        '',
        '# Auditor',
        '',
      ].join('\n'),
    );
  });

  it('omits tools whitelist when all capabilities are granted', () => {
    const handler = new CopilotAgentHandler();

    const rendered = handler.render([
      {
        name: 'builder',
        displayName: 'Builder',
        description: 'Builds features',
        capabilities: ['read', 'edit', 'execute', 'skill', 'subagent'],
        prompt: '# Builder',
      },
    ]);

    expect(rendered[0]?.content).not.toContain('tools:');
  });
});
