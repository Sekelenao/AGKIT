import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitCommand } from '../../../src/command/init/init-command.js';
import { AgkitPaths } from '../../../src/config/agkit-paths.js';
import { MissingConfigError } from '../../../src/config/missing-config-error.js';
import { UserConfigStore } from '../../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../../src/git/git-repository-cache.js';
import { AntigravityHarness } from '../../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from '../../../src/harness/unknown-harness-error.js';
import { ModuleComposer } from '../../../src/template/module-composer.js';
import { TemplateRepositoryLoader } from '../../../src/template/template-repository-loader.js';

async function createTemplateRemoteRepo(baseDir: string): Promise<string> {
  const remoteDir = join(baseDir, 'templates.git');
  const workDir = join(baseDir, 'templates-work');

  await mkdir(remoteDir, { recursive: true });
  await mkdir(join(workDir, 'modules', 'base', 'skills', 'git', 'references'), {
    recursive: true,
  });
  await mkdir(join(workDir, 'modules', 'base', 'agents'), { recursive: true });
  await mkdir(join(workDir, 'modules', 'flink', 'skills', 'flink'), { recursive: true });
  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  await writeFile(
    join(workDir, 'modules', 'base', 'module.json'),
    JSON.stringify({ display_name: 'Base', description: 'Shared rules' }),
    'utf8',
  );
  await writeFile(join(workDir, 'modules', 'base', 'ROOT.md'), '# Base Guide\n', 'utf8');
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'git', 'SKILL.md'),
    '# Git Skill\n',
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'git', 'references', 'commits.md'),
    '# Commits\n',
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'agents', 'reviewer.md'),
    '# Reviewer\n',
    'utf8',
  );

  await writeFile(
    join(workDir, 'modules', 'flink', 'module.json'),
    JSON.stringify({
      display_name: 'Apache Flink',
      description: 'Flink conventions',
      extends: ['base'],
    }),
    'utf8',
  );
  await writeFile(join(workDir, 'modules', 'flink', 'ROOT.md'), '## Flink Guide\n', 'utf8');
  await writeFile(
    join(workDir, 'modules', 'flink', 'skills', 'flink', 'SKILL.md'),
    '# Flink Skill\n',
    'utf8',
  );

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);
  await workGit.add('.');
  await workGit.commit('init templates');
  await workGit.push(['-u', 'origin', 'main']);

  return remoteDir;
}

describe('InitCommand', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);

  let tempDir: string;
  let projectDir: string;
  let configStore: UserConfigStore;
  let command: InitCommand;
  let remoteRepoUrl: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-init-'));
    projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    configStore = new UserConfigStore(paths);
    command = new InitCommand(
      harnessRegistry,
      configStore,
      new GitRepositoryCache(paths),
      new TemplateRepositoryLoader(),
      new ModuleComposer(),
    );
    remoteRepoUrl = await createTemplateRemoteRepo(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('composes and writes AGENTS.md, skills with companion files, and agents for OpenCode', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const result = await command.execute({
      targetDir: projectDir,
      harnessName: 'opencode',
      moduleIds: ['flink'],
    });

    expect(result.resolvedModuleIds).toEqual(['base', 'flink']);
    expect(result.writtenFiles).toEqual([
      'AGENTS.md',
      join('.opencode', 'skills', 'git', 'references', 'commits.md'),
      join('.opencode', 'skills', 'git', 'SKILL.md'),
      join('.opencode', 'skills', 'flink', 'SKILL.md'),
      join('.opencode', 'agents', 'reviewer.md'),
    ]);

    await expect(readFile(join(projectDir, 'AGENTS.md'), 'utf8')).resolves.toBe(
      '# Base Guide\n\n## Flink Guide\n',
    );
    await expect(
      readFile(join(projectDir, '.opencode', 'skills', 'git', 'references', 'commits.md'), 'utf8'),
    ).resolves.toBe('# Commits\n');
    await expect(
      readFile(join(projectDir, '.opencode', 'agents', 'reviewer.md'), 'utf8'),
    ).resolves.toBe('# Reviewer\n');
  });

  it('writes templates to Antigravity paths via alias "agy"', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const result = await command.execute({
      targetDir: projectDir,
      harnessName: 'agy',
      moduleIds: ['base'],
    });

    expect(result.resolvedModuleIds).toEqual(['base']);
    expect(result.writtenFiles).toEqual([
      'AGENTS.md',
      join('.agents', 'skills', 'git', 'references', 'commits.md'),
      join('.agents', 'skills', 'git', 'SKILL.md'),
      join('.agents', 'agents', 'reviewer.md'),
    ]);
  });

  it('throws UnknownHarnessError when harnessName is invalid', async () => {
    await expect(
      command.execute({
        targetDir: projectDir,
        harnessName: 'unknown',
        moduleIds: ['base'],
      }),
    ).rejects.toThrow(UnknownHarnessError);
  });

  it('throws MissingConfigError when no template repository is configured', async () => {
    await expect(
      command.execute({
        targetDir: projectDir,
        harnessName: 'opencode',
        moduleIds: ['base'],
      }),
    ).rejects.toThrow(MissingConfigError);
  });
});
