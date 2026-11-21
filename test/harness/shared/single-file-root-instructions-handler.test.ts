import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SingleFileRootInstructionsHandler } from '../../../src/harness/shared/single-file-root-instructions-handler.js';

describe('SingleFileRootInstructionsHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-root-instructions-handler-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it.each([
    { instructionsPath: 'AGENTS.md', label: 'root-level file' },
    {
      instructionsPath: join('.github', 'copilot-instructions.md'),
      label: 'nested instructions file',
    },
  ])(
    'writes a $label at the configured path and returns its relative path',
    async ({ instructionsPath }) => {
      const handler = new SingleFileRootInstructionsHandler(instructionsPath);
      const content = '# Project Guide\n\nFollow team conventions.\n';

      const writtenPath = await handler.write(tempDir, content);

      expect(writtenPath).toBe(instructionsPath);
      await expect(readFile(join(tempDir, writtenPath), 'utf8')).resolves.toBe(content);
    },
  );

  it('overwrites existing root instructions with updated content', async () => {
    const handler = new SingleFileRootInstructionsHandler('AGENTS.md');

    await handler.write(tempDir, 'initial');
    const writtenPath = await handler.write(tempDir, 'updated');

    await expect(readFile(join(tempDir, writtenPath), 'utf8')).resolves.toBe('updated');
  });
});
