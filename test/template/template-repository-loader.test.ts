import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TemplateRepositoryError } from '../../src/template/template-repository-error.js';
import { TemplateRepositoryLoader } from '../../src/template/template-repository-loader.js';

async function writeRepoFile(repoDir: string, relativePath: string, content: string): Promise<void> {
  const fullPath = join(repoDir, relativePath);
  await mkdir(join(fullPath, '..'), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

describe('TemplateRepositoryLoader', () => {
  const loader = new TemplateRepositoryLoader();
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(join(tmpdir(), 'agkit-template-loader-'));
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it('discovers modules with ROOT.md, JSON+MD skills with companion files, and JSON+MD agents sorted by ID', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({
        display_name: 'Base',
        description: 'Company baseline',
      }),
    );
    await writeRepoFile(repoDir, join('modules', 'base', 'ROOT.md'), '# Base Guide\n');
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'git', 'skill.json'),
      JSON.stringify({ description: 'Git commit conventions' }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'git', 'SKILL.md'),
      '# Git Skill\n',
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'git', 'references', 'examples.md'),
      '# Examples\n',
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'agents', 'reviewer', 'agent.json'),
      JSON.stringify({
        display_name: 'Code Reviewer',
        description: 'Reviews pull requests',
        capabilities: ['read', 'skill'],
      }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'agents', 'reviewer', 'PROMPT.md'),
      '# Reviewer\n',
    );

    await writeRepoFile(
      repoDir,
      join('modules', 'flink', 'module.json'),
      JSON.stringify({
        display_name: 'Apache Flink',
        description: 'Flink streaming conventions',
      }),
    );

    const modules = await loader.loadAll(repoDir);

    expect(modules).toEqual([
      {
        id: 'base',
        displayName: 'Base',
        description: 'Company baseline',
        rootInstructions: '# Base Guide\n',
        skills: [
          {
            name: 'git',
            description: 'Git commit conventions',
            instructions: '# Git Skill\n',
            companionFiles: [
              { relativePath: 'references/examples.md', content: '# Examples\n' },
            ],
          },
        ],
        agents: [
          {
            name: 'reviewer',
            displayName: 'Code Reviewer',
            description: 'Reviews pull requests',
            capabilities: ['read', 'skill'],
            prompt: '# Reviewer\n',
          },
        ],
      },
      {
        id: 'flink',
        displayName: 'Apache Flink',
        description: 'Flink streaming conventions',
        rootInstructions: undefined,
        skills: [],
        agents: [],
      },
    ]);
  });

  it('throws TemplateRepositoryError when modules/ directory is missing', async () => {
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it.each(['BadName', 'java_base', '-leading', 'trailing-'])(
    'throws TemplateRepositoryError for non-kebab-case module directory "%s"',
    async (invalidDirName) => {
      await writeRepoFile(
        repoDir,
        join('modules', invalidDirName, 'module.json'),
        JSON.stringify({ display_name: 'Invalid', description: 'Invalid ID' }),
      );

      await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
    },
  );

  it('throws TemplateRepositoryError when a module is missing module.json', async () => {
    await mkdir(join(repoDir, 'modules', 'base'), { recursive: true });

    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it('throws TemplateRepositoryError when module.json is invalid JSON or fails schema validation', async () => {
    await writeRepoFile(repoDir, join('modules', 'base', 'module.json'), '{bad-json');
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);

    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({ display_name: 'Base', description: '   ' }),
    );
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it('throws TemplateRepositoryError when a skill directory is missing skill.json or SKILL.md', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({ display_name: 'Base', description: 'Base' }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'broken', 'SKILL.md'),
      '# Missing skill.json\n',
    );
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);

    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'broken', 'skill.json'),
      JSON.stringify({ description: 'Broken skill' }),
    );
    await rm(join(repoDir, 'modules', 'base', 'skills', 'broken', 'SKILL.md'));
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it('throws TemplateRepositoryError when an agent directory has invalid capabilities or missing PROMPT.md', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({ display_name: 'Base', description: 'Base' }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'agents', 'reviewer', 'agent.json'),
      JSON.stringify({
        display_name: 'Reviewer',
        description: 'Reviews code',
        capabilities: ['invalid-capability'],
      }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'agents', 'reviewer', 'PROMPT.md'),
      '# Reviewer\n',
    );
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);

    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'agents', 'reviewer', 'agent.json'),
      JSON.stringify({
        display_name: 'Reviewer',
        description: 'Reviews code',
      }),
    );
    await rm(join(repoDir, 'modules', 'base', 'agents', 'reviewer', 'PROMPT.md'));
    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });
});
