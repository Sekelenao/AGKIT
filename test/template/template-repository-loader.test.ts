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

  it('discovers modules with ROOT.md, skills with companion files, and agents sorted by ID', async () => {
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
      join('modules', 'base', 'agents', 'reviewer.md'),
      '# Reviewer\n',
    );

    await writeRepoFile(
      repoDir,
      join('modules', 'flink', 'module.json'),
      JSON.stringify({
        display_name: 'Apache Flink',
        description: 'Flink streaming conventions',
        extends: ['base'],
      }),
    );

    const modules = await loader.loadAll(repoDir);

    expect(modules).toEqual([
      {
        id: 'base',
        displayName: 'Base',
        description: 'Company baseline',
        extends: [],
        rootInstructions: '# Base Guide\n',
        skills: [
          {
            name: 'git',
            files: [
              { relativePath: 'references/examples.md', content: '# Examples\n' },
              { relativePath: 'SKILL.md', content: '# Git Skill\n' },
            ],
          },
        ],
        agents: [{ name: 'reviewer', content: '# Reviewer\n' }],
      },
      {
        id: 'flink',
        displayName: 'Apache Flink',
        description: 'Flink streaming conventions',
        extends: ['base'],
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

  it('throws TemplateRepositoryError when a skill directory is missing SKILL.md', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({ display_name: 'Base', description: 'Base' }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'skills', 'broken', 'notes.md'),
      '# Not SKILL.md\n',
    );

    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it('ignores non-markdown entries inside agents/', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'base', 'module.json'),
      JSON.stringify({ display_name: 'Base', description: 'Base' }),
    );
    await writeRepoFile(repoDir, join('modules', 'base', 'agents', '.gitkeep'), '');
    await writeRepoFile(repoDir, join('modules', 'base', 'agents', 'reviewer.md'), '# Reviewer\n');

    const modules = await loader.loadAll(repoDir);

    expect(modules[0]?.agents).toEqual([{ name: 'reviewer', content: '# Reviewer\n' }]);
  });

  it('throws TemplateRepositoryError when extends references an unknown module', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'flink', 'module.json'),
      JSON.stringify({
        display_name: 'Flink',
        description: 'Flink',
        extends: ['missing-parent'],
      }),
    );

    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });

  it('throws TemplateRepositoryError when a dependency cycle exists', async () => {
    await writeRepoFile(
      repoDir,
      join('modules', 'a', 'module.json'),
      JSON.stringify({ display_name: 'A', description: 'A', extends: ['b'] }),
    );
    await writeRepoFile(
      repoDir,
      join('modules', 'b', 'module.json'),
      JSON.stringify({ display_name: 'B', description: 'B', extends: ['a'] }),
    );

    await expect(loader.loadAll(repoDir)).rejects.toThrow(TemplateRepositoryError);
  });
});
