import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgkitPaths } from '../../src/config/agkit-paths.js';
import { GitCommandError } from '../../src/git/git-command-error.js';
import { GitRepositoryCache } from '../../src/git/git-repository-cache.js';

async function createLocalRemoteRepo(
  baseDir: string,
  name: string,
  initialContent: string,
): Promise<{ readonly remoteDir: string; readonly workDir: string }> {
  const remoteDir = join(baseDir, `${name}.git`);
  const workDir = join(baseDir, `${name}-work`);

  await mkdir(remoteDir, { recursive: true });
  await mkdir(workDir, { recursive: true });

  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);

  await writeFile(join(workDir, 'README.md'), initialContent, 'utf8');
  await workGit.add('README.md');
  await workGit.commit('initial commit');
  await workGit.push(['-u', 'origin', 'main']);

  return { remoteDir, workDir };
}

describe('GitRepositoryCache', () => {
  let tempDir: string;
  let cache: GitRepositoryCache;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-git-cache-'));
    cache = new GitRepositoryCache(new AgkitPaths(join(tempDir, '.agkit')));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('clones a repository and fetches subsequent upstream commits', async () => {
    const { remoteDir, workDir } = await createLocalRemoteRepo(
      tempDir,
      'templates',
      'v1',
    );

    const cacheDir = await cache.sync(remoteDir);
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe('v1');

    await writeFile(join(workDir, 'README.md'), 'v2', 'utf8');
    const workGit = simpleGit(workDir);
    await workGit.add('README.md');
    await workGit.commit('update to v2');
    await workGit.push('origin', 'main');

    await cache.sync(remoteDir);
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe('v2');
  });

  it('checks out a specific tag when ref is provided', async () => {
    const { remoteDir, workDir } = await createLocalRemoteRepo(
      tempDir,
      'tagged',
      'v1',
    );
    const workGit = simpleGit(workDir);
    await workGit.addTag('v1.0.0');
    await workGit.pushTags('origin');

    await writeFile(join(workDir, 'README.md'), 'v2', 'utf8');
    await workGit.add('README.md');
    await workGit.commit('v2');
    await workGit.push('origin', 'main');

    const cacheDir = await cache.sync(remoteDir, 'v1.0.0');
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe('v1');
  });

  it('re-clones cleanly when the configured repository URL changes', async () => {
    const repoA = await createLocalRemoteRepo(tempDir, 'repo-a', 'from-a');
    const repoB = await createLocalRemoteRepo(tempDir, 'repo-b', 'from-b');

    const cacheDir = await cache.sync(repoA.remoteDir);
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe('from-a');

    await cache.sync(repoB.remoteDir);
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe('from-b');
  });

  it('handles cloning an empty repository without failing checkout', async () => {
    const emptyRemoteDir = join(tempDir, 'empty.git');
    await mkdir(emptyRemoteDir, { recursive: true });
    await simpleGit(emptyRemoteDir).init(true, ['--initial-branch=main']);

    const cacheDir = await cache.sync(emptyRemoteDir);
    expect(cacheDir).toBe(join(tempDir, '.agkit', 'cache', 'repo'));
  });

  it('resolves origin/HEAD and checks out files after an initially empty repository receives its first commit', async () => {
    const remoteDir = join(tempDir, 'initially-empty.git');
    const workDir = join(tempDir, 'initially-empty-work');
    await mkdir(remoteDir, { recursive: true });
    await mkdir(workDir, { recursive: true });
    await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

    const cacheDir = await cache.sync(remoteDir);

    const workGit = simpleGit(workDir);
    await workGit.init(['--initial-branch=main']);
    await workGit.addConfig('user.name', 'Test User');
    await workGit.addConfig('user.email', 'test@example.com');
    await workGit.addRemote('origin', remoteDir);
    await writeFile(join(workDir, 'README.md'), 'first commit', 'utf8');
    await workGit.add('README.md');
    await workGit.commit('initial commit');
    await workGit.push(['-u', 'origin', 'main']);

    await cache.sync(remoteDir);
    expect(await readFile(join(cacheDir, 'README.md'), 'utf8')).toBe(
      'first commit',
    );
  });

  it('throws a clear GitCommandError when the requested branch or tag does not exist', async () => {
    const { remoteDir } = await createLocalRemoteRepo(tempDir, 'refs', 'v1');

    await expect(cache.sync(remoteDir, 'non-existent-ref')).rejects.toThrow(
      'Branch or tag "non-existent-ref" was not found in repository.',
    );
  });

  it('throws GitCommandError when cloning an unreachable repository', async () => {
    await expect(
      cache.sync(join(tempDir, 'does-not-exist.git')),
    ).rejects.toThrow(GitCommandError);
  });

  it('rejects repository URLs and refs starting with "-" to prevent Git option injection', async () => {
    await expect(cache.sync('--upload-pack=evil')).rejects.toThrow(GitCommandError);
    await expect(
      cache.sync('https://example.com/repo.git', '--evil-ref'),
    ).rejects.toThrow(GitCommandError);
  });
});
