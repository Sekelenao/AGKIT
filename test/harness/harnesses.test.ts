import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import type { Harness } from '../../src/harness/harness.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';

describe('Harness default handlers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-harnesses-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it.each<{
    readonly label: string;
    readonly createHarness: () => Harness;
    readonly expectedSkillPath: string;
    readonly expectedAgentPath: string;
    readonly expectedRootInstructionsPath: string;
  }>([
    {
      label: 'OpencodeHarness',
      createHarness: () => new OpencodeHarness(),
      expectedSkillPath: join('.opencode', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.opencode', 'agents', 'reviewer.md'),
      expectedRootInstructionsPath: 'AGENTS.md',
    },
    {
      label: 'AntigravityHarness',
      createHarness: () => new AntigravityHarness(),
      expectedSkillPath: join('.agents', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.agents', 'agents', 'reviewer.md'),
      expectedRootInstructionsPath: 'AGENTS.md',
    },
  ])(
    '$label writes skills, agents, and root instructions to its expected locations',
    async ({
      createHarness,
      expectedSkillPath,
      expectedAgentPath,
      expectedRootInstructionsPath,
    }) => {
      const harness = createHarness();

      const skillPath = await harness.skills.write(tempDir, 'testing', '# Testing Skill');
      const agentPath = await harness.agents.write(tempDir, 'reviewer', '# Reviewer Agent');
      const rootPath = await harness.rootInstructions.write(tempDir, '# Root Instructions');

      expect(skillPath).toBe(expectedSkillPath);
      expect(agentPath).toBe(expectedAgentPath);
      expect(rootPath).toBe(expectedRootInstructionsPath);

      await expect(readFile(join(tempDir, skillPath), 'utf8')).resolves.toBe('# Testing Skill');
      await expect(readFile(join(tempDir, agentPath), 'utf8')).resolves.toBe('# Reviewer Agent');
      await expect(readFile(join(tempDir, rootPath), 'utf8')).resolves.toBe('# Root Instructions');
    },
  );
});
