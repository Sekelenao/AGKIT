import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BobCustomModesAgentHandler } from '../../../src/harness/bob/bob-custom-modes-agent-handler.js';

describe('BobCustomModesAgentHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-bob-agents-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns no files when there are no agents to render', async () => {
    const handler = new BobCustomModesAgentHandler();
    expect(handler.render([])).toEqual([]);
    await expect(handler.writeAll(tempDir, [])).resolves.toEqual([]);
  });

  it('aggregates multiple typed agents into a single .bob/custom_modes.yaml file', async () => {
    const handler = new BobCustomModesAgentHandler();

    const written = await handler.writeAll(tempDir, [
      {
        name: 'security-auditor',
        displayName: 'Security Auditor',
        description: 'Audits code for OWASP vulnerabilities',
        whenToUse: 'Use when reviewing pull requests or auth changes',
        capabilities: ['read', 'skill'],
        fileRegex: '.*\\.ts$',
        prompt: 'You review pull requests for security risks.\nFlag injection issues.',
      },
      {
        name: 'code-reviewer',
        displayName: 'Code Reviewer',
        description: 'Reviews code for clarity',
        capabilities: ['read', 'edit', 'execute', 'skill', 'subagent'],
        prompt: 'Review code for clarity and maintainability.',
      },
    ]);

    expect(written).toHaveLength(1);
    expect(written[0]?.relativePath).toBe(join('.bob', 'custom_modes.yaml'));

    const yaml = await readFile(join(tempDir, '.bob', 'custom_modes.yaml'), 'utf8');
    expect(yaml).toContain('customModes:');
    expect(yaml).toContain('- slug: "security-auditor"');
    expect(yaml).toContain('name: "Security Auditor"');
    expect(yaml).toContain('description: "Audits code for OWASP vulnerabilities"');
    expect(yaml).toContain('whenToUse: "Use when reviewing pull requests or auth changes"');
    expect(yaml).toContain('      You review pull requests for security risks.');
    expect(yaml).toContain('fileRegex: ".*\\\\.ts$"');
    expect(yaml).toContain('- slug: "code-reviewer"');
    expect(yaml).toContain('name: "Code Reviewer"');
    expect(yaml).toContain('      Review code for clarity and maintainability.');
    expect(yaml).toContain('- subagent');
  });
});
