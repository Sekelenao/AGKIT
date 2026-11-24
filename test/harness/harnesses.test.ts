import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { BobHarness } from '../../src/harness/bob/bob-harness.js';
import { ClaudeHarness } from '../../src/harness/claude/claude-harness.js';
import { CodexHarness } from '../../src/harness/codex/codex-harness.js';
import { CopilotHarness } from '../../src/harness/copilot/copilot-harness.js';
import { CursorHarness } from '../../src/harness/cursor/cursor-harness.js';
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
    {
      label: 'ClaudeHarness',
      createHarness: () => new ClaudeHarness(),
      expectedSkillPath: join('.claude', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.claude', 'agents', 'reviewer.md'),
      expectedRootInstructionsPath: 'CLAUDE.md',
    },
    {
      label: 'CodexHarness',
      createHarness: () => new CodexHarness(),
      expectedSkillPath: join('.agents', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.codex', 'agents', 'reviewer.toml'),
      expectedRootInstructionsPath: 'AGENTS.md',
    },
    {
      label: 'CopilotHarness',
      createHarness: () => new CopilotHarness(),
      expectedSkillPath: join('.github', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.github', 'agents', 'reviewer.agent.md'),
      expectedRootInstructionsPath: join('.github', 'copilot-instructions.md'),
    },
    {
      label: 'CursorHarness',
      createHarness: () => new CursorHarness(),
      expectedSkillPath: join('.cursor', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.cursor', 'agents', 'reviewer.md'),
      expectedRootInstructionsPath: 'AGENTS.md',
    },
    {
      label: 'BobHarness',
      createHarness: () => new BobHarness(),
      expectedSkillPath: join('.bob', 'skills', 'testing', 'SKILL.md'),
      expectedAgentPath: join('.bob', 'custom_modes.yaml'),
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

      const skillFiles = await harness.skills.write(tempDir, {
        name: 'testing',
        description: 'Testing skill',
        instructions: '# Testing Skill',
        companionFiles: [],
      });
      const agentFiles = await harness.agents.writeAll(tempDir, [
        {
          name: 'reviewer',
          displayName: 'Reviewer',
          description: 'Reviews code',
          capabilities: ['read'],
          prompt: '# Reviewer Agent',
        },
      ]);
      const rootPath = await harness.rootInstructions.write(tempDir, '# Root Instructions');

      expect(skillFiles.map((file) => file.relativePath)).toEqual([expectedSkillPath]);
      expect(agentFiles.map((file) => file.relativePath)).toEqual([expectedAgentPath]);
      expect(rootPath).toBe(expectedRootInstructionsPath);

      await expect(readFile(join(tempDir, expectedSkillPath), 'utf8')).resolves.toContain(
        '# Testing Skill',
      );
      await expect(readFile(join(tempDir, expectedAgentPath), 'utf8')).resolves.toContain(
        '# Reviewer Agent',
      );
      await expect(readFile(join(tempDir, rootPath), 'utf8')).resolves.toBe('# Root Instructions');
    },
  );
});
