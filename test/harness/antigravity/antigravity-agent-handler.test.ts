import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AntigravityAgentHandler } from '../../../src/harness/antigravity/antigravity-agent-handler.js';

describe('AntigravityAgentHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-antigravity-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('maps capabilities to deduplicated tools, mode flags, and skills paths', async () => {
    const handler = new AntigravityAgentHandler();

    const written = await handler.writeAll(tempDir, [
      {
        name: 'module-scanner',
        displayName: 'Module Scanner',
        description: 'Audits production code',
        mode: 'all',
        capabilities: ['read', 'edit', 'execute', 'skill'],
        skills: ['properties', 'nullability', 'properties'],
        prompt: '# Module Scanner\n\nAudit carefully.',
      },
    ]);

    const expectedPath = join('.agents', 'agents', 'module-scanner.md');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        '---',
        'name: module-scanner',
        'description: "Audits production code"',
        'tools:',
        '  - read_file',
        '  - write_file',
        '  - edit_file',
        '  - run_command',
        '  - manage_task',
        'subagent: true',
        'mainAgent: true',
        'skills:',
        '  - skills/properties',
        '  - skills/nullability',
        '---',
        '',
        '# Module Scanner',
        '',
        'Audit carefully.',
        '',
      ].join('\n'),
    );
  });

  it.each<{
    readonly mode: 'subagent' | 'primary';
    readonly expectedSubagent: string;
    readonly expectedMainAgent: string;
  }>([
    { mode: 'subagent', expectedSubagent: 'subagent: true', expectedMainAgent: 'mainAgent: false' },
    { mode: 'primary', expectedSubagent: 'subagent: false', expectedMainAgent: 'mainAgent: true' },
  ])('renders $mode mode flags accurately', ({ mode, expectedSubagent, expectedMainAgent }) => {
    const handler = new AntigravityAgentHandler();

    const rendered = handler.render([
      {
        name: 'helper',
        displayName: 'Helper',
        description: 'Assists',
        mode,
        capabilities: ['read', 'subagent'],
        prompt: 'Help.',
      },
    ]);

    expect(rendered[0]?.content).toContain(expectedSubagent);
    expect(rendered[0]?.content).toContain(expectedMainAgent);
    expect(rendered[0]?.content).toContain('  - invoke_subagent');
    expect(rendered[0]?.content).toContain('  - send_message');
    expect(rendered[0]?.content).not.toContain('skills:');
  });

  it('omits tools whitelist when all capabilities are granted', () => {
    const handler = new AntigravityAgentHandler();

    const rendered = handler.render([
      {
        name: 'generalist',
        displayName: 'Generalist',
        description: 'Handles any task',
        capabilities: ['read', 'edit', 'execute', 'skill', 'subagent'],
        prompt: 'Assist.',
      },
    ]);

    expect(rendered[0]?.content).not.toContain('tools:');
  });
});
