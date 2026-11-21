import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContentHasher } from '../../src/manifest/content-hasher.js';
import { InvalidManifestError } from '../../src/manifest/invalid-manifest-error.js';
import { ProjectManifestStore } from '../../src/manifest/project-manifest-store.js';

describe('ProjectManifestStore & ContentHasher', () => {
  const hasher = new ContentHasher();
  const store = new ProjectManifestStore();
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-manifest-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('normalizes CRLF and LF to the same SHA256 digest', () => {
    expect(hasher.hash('line1\r\nline2\r\n')).toBe(hasher.hash('line1\nline2\n'));
  });

  it('returns undefined when .agkit.json does not exist', async () => {
    await expect(store.load(tempDir)).resolves.toBeUndefined();
  });

  it('saves with sorted managed_files keys and reloads identically', async () => {
    const hashA = hasher.hash('a');
    const hashB = hasher.hash('b');

    const fileName = await store.save(tempDir, {
      harness: 'opencode',
      modules: ['flink'],
      git_repository_url: 'git@github.com:org/templates.git',
      managed_files: {
        'z.md': hashB,
        'AGENTS.md': hashA,
      },
    });

    expect(fileName).toBe('.agkit.json');

    const raw = await readFile(join(tempDir, '.agkit.json'), 'utf8');
    expect(raw.indexOf('"AGENTS.md"')).toBeLessThan(raw.indexOf('"z.md"'));

    await expect(store.load(tempDir)).resolves.toEqual({
      harness: 'opencode',
      modules: ['flink'],
      git_repository_url: 'git@github.com:org/templates.git',
      managed_files: {
        'AGENTS.md': hashA,
        'z.md': hashB,
      },
    });
  });

  it('throws InvalidManifestError on malformed JSON', async () => {
    await writeFile(join(tempDir, '.agkit.json'), '{bad', 'utf8');

    await expect(store.load(tempDir)).rejects.toThrow(InvalidManifestError);
  });

  it.each([
    {
      harness: '',
      modules: ['base'],
      git_repository_url: 'https://example.com/repo.git',
      managed_files: {},
    },
    {
      harness: 'opencode',
      modules: [],
      git_repository_url: 'https://example.com/repo.git',
      managed_files: {},
    },
    {
      harness: 'opencode',
      modules: ['base'],
      git_repository_url: 'https://example.com/repo.git',
      managed_files: { 'AGENTS.md': 'not-a-sha256' },
    },
  ])('throws InvalidManifestError on invalid manifest payload %o', async (invalid) => {
    await expect(store.save(tempDir, invalid)).rejects.toThrow(InvalidManifestError);
  });
});
