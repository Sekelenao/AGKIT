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

  it('writes an agent markdown file inside the configured root directory and returns its relative path', async () => {
    const handler = new DirectoryAgentHandler(join('.opencode', 'agents'));
    const content = '# Code Reviewer\n\nReview changes carefully.\n';

    const writtenPath = await handler.write(tempDir, 'code-reviewer', content);

    expect(writtenPath).toBe(join('.opencode', 'agents', 'code-reviewer.md'));
    await expect(readFile(join(tempDir, writtenPath), 'utf8')).resolves.toBe(content);
  });

  it('overwrites an existing agent file with updated content', async () => {
    const handler = new DirectoryAgentHandler(join('.agents', 'agents'));

    await handler.write(tempDir, 'architect', 'v1');
    const writtenPath = await handler.write(tempDir, 'architect', 'v2');

    await expect(readFile(join(tempDir, writtenPath), 'utf8')).resolves.toBe('v2');
  });
});
