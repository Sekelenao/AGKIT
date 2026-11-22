import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ListCommand } from '../../../src/command/list/list-command.js';
import { AgkitPaths } from '../../../src/config/agkit-paths.js';
import { MissingConfigError } from '../../../src/config/missing-config-error.js';
import { UserConfigStore } from '../../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../../src/git/git-repository-cache.js';
import { TemplateRepositoryLoader } from '../../../src/template/template-repository-loader.js';

async function createTemplateRemoteRepo(baseDir: string): Promise<string> {
  const remoteDir = join(baseDir, 'templates.git');
  const workDir = join(baseDir, 'templates-work');

  await mkdir(remoteDir, { recursive: true });
  await mkdir(join(workDir, 'modules', 'base'), { recursive: true });
  await mkdir(join(workDir, 'modules', 'flink'), { recursive: true });
  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  await writeFile(
    join(workDir, 'modules', 'base', 'module.json'),
    JSON.stringify({ display_name: 'Base', description: 'Shared company defaults' }),
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'flink', 'module.json'),
    JSON.stringify({
      display_name: 'Apache Flink',
      description: 'Flink streaming jobs',
    }),
    'utf8',
  );

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);
  await workGit.add('.');
  await workGit.commit('add initial modules');
  await workGit.push(['-u', 'origin', 'main']);

  return remoteDir;
}

describe('ListCommand', () => {
  let tempDir: string;
  let configStore: UserConfigStore;
  let listCommand: ListCommand;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-list-'));
    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    configStore = new UserConfigStore(paths);
    listCommand = new ListCommand(
      configStore,
      new GitRepositoryCache(paths),
      new TemplateRepositoryLoader(),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws MissingConfigError when no template repository is configured', async () => {
    await expect(listCommand.execute()).rejects.toThrow(MissingConfigError);
  });

  it('syncs the configured repository and returns all discovered modules', async () => {
    const remoteRepoUrl = await createTemplateRemoteRepo(tempDir);
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const result = await listCommand.execute();

    expect(
      result.modules.map((mod) => ({ id: mod.id, displayName: mod.displayName })),
    ).toEqual([
      { id: 'base', displayName: 'Base' },
      { id: 'flink', displayName: 'Apache Flink' },
    ]);
  });
});
