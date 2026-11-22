import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NewCommand } from '../../../src/command/new/new-command.js';
import { AntigravityHarness } from '../../../src/harness/antigravity/antigravity-harness.js';
import { ClaudeHarness } from '../../../src/harness/claude/claude-harness.js';
import { HarnessRegistry } from '../../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../../src/harness/unknown-harness-error.js';
import { TemplateRepositoryError } from '../../../src/template/template-repository-error.js';
import { TemplateRepositoryLoader } from '../../../src/template/template-repository-loader.js';

describe('NewCommand', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
    new ClaudeHarness(),
  ]);

  let tempDir: string;
  let command: NewCommand;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-new-'));
    command = new NewCommand(harnessRegistry);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('scaffolds a valid template repository and installs the authoring skills for the selected harness', async () => {
    const result = await command.execute({
      targetDir: tempDir,
      harnessName: 'agy',
    });

    expect(result.harnessName).toBe('antigravity');
    expect(result.writtenFiles).toContain('README.md');
    expect(result.writtenFiles).toContain(join('modules', 'example', 'module.json'));

    const expectedSkills = [
      'agkit-template-authoring',
      'agkit-root-authoring',
      'agkit-skill-authoring',
      'agkit-agent-authoring',
    ];

    for (const skillName of expectedSkills) {
      const relativeSkillPath = join('.agents', 'skills', skillName, 'SKILL.md');
      expect(result.writtenFiles).toContain(relativeSkillPath);

      const content = await readFile(join(tempDir, relativeSkillPath), 'utf8');
      expect(content).toContain(`name: ${skillName}`);
      expect(content).toContain('agkit spec');
    }

    const loader = new TemplateRepositoryLoader();
    const modules = await loader.loadAll(tempDir);
    expect(modules.map((mod) => mod.id)).toEqual(['example']);
    expect(modules[0]?.skills.map((skill) => skill.name)).toEqual(['example-skill']);
    expect(modules[0]?.agents.map((agent) => agent.name)).toEqual(['example-agent']);
  });

  it('throws TemplateRepositoryError when a modules/ directory already exists', async () => {
    await mkdir(join(tempDir, 'modules'), { recursive: true });

    await expect(
      command.execute({
        targetDir: tempDir,
        harnessName: 'opencode',
      }),
    ).rejects.toThrow(TemplateRepositoryError);
  });

  it('throws UnknownHarnessError when harnessName is invalid', async () => {
    await expect(
      command.execute({
        targetDir: tempDir,
        harnessName: 'unknown',
      }),
    ).rejects.toThrow(UnknownHarnessError);
  });
});
