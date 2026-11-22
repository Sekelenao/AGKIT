import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgkitPaths } from '../../src/config/agkit-paths.js';
import { InvalidConfigError } from '../../src/config/invalid-config-error.js';
import { UserConfigStore } from '../../src/config/user-config-store.js';

describe('UserConfigStore', () => {
  let tempDir: string;
  let store: UserConfigStore;
  let paths: AgkitPaths;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-config-'));
    paths = new AgkitPaths(tempDir);
    store = new UserConfigStore(paths);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns undefined when config file does not exist yet', async () => {
    await expect(store.load()).resolves.toBeUndefined();
  });

  it('saves and reloads a valid configuration with trimmed values', async () => {
    await store.save({
      git_repository_url: '  git@github.com:org/templates.git  ',
      default_ref: '  main  ',
    });

    await expect(store.load()).resolves.toEqual({
      git_repository_url: 'git@github.com:org/templates.git',
      default_ref: 'main',
    });
  });

  it('throws InvalidConfigError on malformed JSON', async () => {
    await writeFile(paths.configFilePath, '{not-json', 'utf8');

    await expect(store.load()).rejects.toThrow(InvalidConfigError);
  });

  it.each([
    { git_repository_url: '' },
    { git_repository_url: '   ' },
    { git_repository_url: '--upload-pack=evil' },
    { git_repository_url: 'git@github.com:org/templates.git', default_ref: '   ' },
    { git_repository_url: 'git@github.com:org/templates.git', default_ref: '--bad-ref' },
  ])('rejects invalid configuration %o', async (invalid) => {
    await expect(store.save(invalid)).rejects.toThrow(InvalidConfigError);
  });
});
