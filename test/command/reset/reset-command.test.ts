import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResetCommand } from '../../../src/command/reset/reset-command.js';
import { AgkitPaths } from '../../../src/config/agkit-paths.js';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

describe('ResetCommand', () => {
  let tempDir: string;
  let paths: AgkitPaths;
  let command: ResetCommand;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-reset-'));
    paths = new AgkitPaths(join(tempDir, '.agkit'));
    command = new ResetCommand(paths);

    await mkdir(paths.repoCacheDir, { recursive: true });
    await writeFile(paths.configFilePath, '{"git_repository_url":"https://example.com/repo.git"}\n', 'utf8');
    await writeFile(join(paths.repoCacheDir, 'README.md'), 'cached', 'utf8');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('removes the entire agkit root directory when no flags are provided', async () => {
    const result = await command.execute();

    expect(result.removedPaths).toEqual([paths.rootDir]);
    await expect(pathExists(paths.rootDir)).resolves.toBe(false);
  });

  it('removes only the cache directory when --cache is set', async () => {
    const result = await command.execute({ cache: true });

    expect(result.removedPaths).toEqual([paths.cacheDir]);
    await expect(pathExists(paths.cacheDir)).resolves.toBe(false);
    await expect(pathExists(paths.configFilePath)).resolves.toBe(true);
  });

  it('removes only the configuration file when --config is set', async () => {
    const result = await command.execute({ config: true });

    expect(result.removedPaths).toEqual([paths.configFilePath]);
    await expect(pathExists(paths.configFilePath)).resolves.toBe(false);
    await expect(pathExists(paths.repoCacheDir)).resolves.toBe(true);
  });

  it('removes both config and cache when both flags are set', async () => {
    const result = await command.execute({ cache: true, config: true });

    expect(result.removedPaths).toEqual([paths.configFilePath, paths.cacheDir]);
    await expect(pathExists(paths.configFilePath)).resolves.toBe(false);
    await expect(pathExists(paths.cacheDir)).resolves.toBe(false);
    await expect(pathExists(paths.rootDir)).resolves.toBe(true);
  });

  it('returns an empty list without failing when nothing exists to remove', async () => {
    await rm(paths.rootDir, { recursive: true, force: true });

    const result = await command.execute();

    expect(result.removedPaths).toEqual([]);
  });
});
