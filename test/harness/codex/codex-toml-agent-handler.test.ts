import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CodexTomlAgentHandler } from '../../../src/harness/codex/codex-toml-agent-handler.js';

describe('CodexTomlAgentHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-codex-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes a read-only TOML agent when edit capability is absent', async () => {
    const handler = new CodexTomlAgentHandler();

    const written = await handler.writeAll(tempDir, [
      {
        name: 'security-auditor',
        displayName: 'Security Auditor',
        description: 'Audits code changes read-only',
        capabilities: ['read', 'execute'],
        prompt: 'Inspect path C:\\src and avoid """ triple quotes.',
      },
    ]);

    const expectedPath = join('.codex', 'agents', 'security-auditor.toml');
    expect(written.map((file) => file.relativePath)).toEqual([expectedPath]);

    const content = await readFile(join(tempDir, expectedPath), 'utf8');
    expect(content).toBe(
      [
        'name = "security-auditor"',
        'description = "Audits code changes read-only"',
        'sandbox_mode = "read-only"',
        'developer_instructions = """',
        'Inspect path C:\\\\src and avoid \\"\\"\\" triple quotes.',
        '"""',
        '',
      ].join('\n'),
    );
  });

  it('sets sandbox_mode to workspace-write when edit capability is present', () => {
    const handler = new CodexTomlAgentHandler();

    const rendered = handler.render([
      {
        name: 'implementer',
        displayName: 'Implementer',
        description: 'Implements changes',
        capabilities: ['read', 'edit', 'execute'],
        prompt: 'Implement the requested feature.',
      },
    ]);

    expect(rendered[0]?.content).toContain('sandbox_mode = "workspace-write"');
  });
});
