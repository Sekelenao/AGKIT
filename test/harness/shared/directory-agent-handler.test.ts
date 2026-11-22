import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DirectoryAgentHandler } from '../../../src/harness/shared/directory-agent-handler.js';

describe('DirectoryAgentHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-agent-handler-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes agent markdown files with generated frontmatter inside the configured root directory', async () => {
    const handler = new DirectoryAgentHandler(join('.opencode', 'agents'));

    const written = await handler.writeAll(tempDir, [
      {
        name: 'code-reviewer',
        displayName: 'Code Reviewer',
        description: 'Reviews pull requests',
        capabilities: ['read', 'skill'],
        prompt: '# Code Reviewer\n\nReview changes carefully.\n',
      },
    ]);

    const expectedContent =
      '---\nname: code-reviewer\ndescription: "Reviews pull requests"\n---\n\n# Code Reviewer\n\nReview changes carefully.\n';

    expect(written).toEqual([
      {
        relativePath: join('.opencode', 'agents', 'code-reviewer.md'),
        content: expectedContent,
      },
    ]);
    await expect(
      readFile(join(tempDir, '.opencode', 'agents', 'code-reviewer.md'), 'utf8'),
    ).resolves.toBe(expectedContent);
  });

  it('overwrites an existing agent file with updated content', async () => {
    const handler = new DirectoryAgentHandler(join('.agents', 'agents'));

    await handler.writeAll(tempDir, [
      {
        name: 'architect',
        displayName: 'Architect',
        description: 'Designs systems',
        capabilities: ['read'],
        prompt: 'v1',
      },
    ]);
    const written = await handler.writeAll(tempDir, [
      {
        name: 'architect',
        displayName: 'Architect',
        description: 'Designs systems',
        capabilities: ['read'],
        prompt: 'v2',
      },
    ]);

    expect(written[0]?.relativePath).toBe(join('.agents', 'agents', 'architect.md'));
    await expect(
      readFile(join(tempDir, '.agents', 'agents', 'architect.md'), 'utf8'),
    ).resolves.toContain('\n\nv2\n');
  });

  it('supports a custom agent file extension such as .agent.md', async () => {
    const handler = new DirectoryAgentHandler(join('.github', 'agents'), '.agent.md');

    const written = await handler.writeAll(tempDir, [
      {
        name: 'security-auditor',
        displayName: 'Security Auditor',
        description: 'Audits security boundaries',
        capabilities: ['read'],
        prompt: '# Security Auditor',
      },
    ]);

    expect(written[0]?.relativePath).toBe(
      join('.github', 'agents', 'security-auditor.agent.md'),
    );
    await expect(
      readFile(join(tempDir, '.github', 'agents', 'security-auditor.agent.md'), 'utf8'),
    ).resolves.toContain('name: security-auditor');
  });
});
