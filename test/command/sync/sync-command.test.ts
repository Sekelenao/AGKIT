import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitCommand } from '../../../src/command/init/init-command.js';
import { SyncCommand, type SyncConflict } from '../../../src/command/sync/sync-command.js';
import { AgkitPaths } from '../../../src/config/agkit-paths.js';
import { UserConfigStore } from '../../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../../src/git/git-repository-cache.js';
import { AntigravityHarness } from '../../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../../src/harness/opencode/opencode-harness.js';
import { ContentHasher } from '../../../src/manifest/content-hasher.js';
import { MissingManifestError } from '../../../src/manifest/missing-manifest-error.js';
import { ProjectManifestStore } from '../../../src/manifest/project-manifest-store.js';
import { ModuleComposer } from '../../../src/template/module-composer.js';
import { TemplateRepositoryLoader } from '../../../src/template/template-repository-loader.js';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

interface RemoteRepoFixture {
  readonly remoteDir: string;
  readonly workDir: string;
  commitAndPush(message: string): Promise<void>;
}

async function createTemplateRemoteRepo(baseDir: string): Promise<RemoteRepoFixture> {
  const remoteDir = join(baseDir, 'templates.git');
  const workDir = join(baseDir, 'templates-work');

  await mkdir(remoteDir, { recursive: true });
  await mkdir(join(workDir, 'modules', 'base', 'skills', 'git'), { recursive: true });
  await mkdir(join(workDir, 'modules', 'base', 'agents', 'old-agent'), { recursive: true });
  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  await writeFile(
    join(workDir, 'modules', 'base', 'module.json'),
    JSON.stringify({ display_name: 'Base', description: 'Shared rules' }),
    'utf8',
  );
  await writeFile(join(workDir, 'modules', 'base', 'ROOT.md'), '# Base v1\n', 'utf8');
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'git', 'skill.json'),
    JSON.stringify({ description: 'Git skill' }),
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'git', 'SKILL.md'),
    '# Git v1\n',
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'agents', 'old-agent', 'agent.json'),
    JSON.stringify({ display_name: 'Old Agent', description: 'Legacy agent' }),
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'agents', 'old-agent', 'PROMPT.md'),
    '# Old Agent\n',
    'utf8',
  );

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);

  const commitAndPush = async (message: string): Promise<void> => {
    await workGit.add(['-A']);
    await workGit.commit(message);
    await workGit.push(['-u', 'origin', 'main']);
  };

  await commitAndPush('v1');

  return { remoteDir, workDir, commitAndPush };
}

describe('SyncCommand', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);
  const manifestStore = new ProjectManifestStore();
  const contentHasher = new ContentHasher();

  let tempDir: string;
  let projectDir: string;
  let configStore: UserConfigStore;
  let initCommand: InitCommand;
  let syncCommand: SyncCommand;
  let fixture: RemoteRepoFixture;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-sync-'));
    projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    const repositoryCache = new GitRepositoryCache(paths);
    const templateLoader = new TemplateRepositoryLoader();
    const moduleComposer = new ModuleComposer();

    configStore = new UserConfigStore(paths);
    initCommand = new InitCommand(
      harnessRegistry,
      configStore,
      repositoryCache,
      templateLoader,
      moduleComposer,
      manifestStore,
      contentHasher,
    );
    syncCommand = new SyncCommand(
      harnessRegistry,
      repositoryCache,
      templateLoader,
      moduleComposer,
      manifestStore,
      contentHasher,
    );
    fixture = await createTemplateRemoteRepo(tempDir);
    await configStore.save({ git_repository_url: fixture.remoteDir });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws MissingManifestError when .agkit.json does not exist', async () => {
    await expect(syncCommand.execute({ targetDir: projectDir })).rejects.toThrow(
      MissingManifestError,
    );
  });

  it('updates unmodified files, adds new upstream files, deletes removed upstream files, and preserves project files', async () => {
    await initCommand.execute({
      targetDir: projectDir,
      harnessName: 'opencode',
      moduleIds: ['base'],
    });

    // Project-owned file absent from .agkit.json
    const projectCustomAgent = join(projectDir, '.opencode', 'agents', 'project-custom.md');
    await writeFile(projectCustomAgent, '# Project Only\n', 'utf8');

    // Upstream changes: update ROOT.md, delete old-agent, add new-agent
    await writeFile(join(fixture.workDir, 'modules', 'base', 'ROOT.md'), '# Base v2\n', 'utf8');
    await rm(join(fixture.workDir, 'modules', 'base', 'agents', 'old-agent'), {
      recursive: true,
      force: true,
    });
    await mkdir(join(fixture.workDir, 'modules', 'base', 'agents', 'new-agent'), {
      recursive: true,
    });
    await writeFile(
      join(fixture.workDir, 'modules', 'base', 'agents', 'new-agent', 'agent.json'),
      JSON.stringify({ display_name: 'New Agent', description: 'Newly added agent' }),
      'utf8',
    );
    await writeFile(
      join(fixture.workDir, 'modules', 'base', 'agents', 'new-agent', 'PROMPT.md'),
      '# New Agent\n',
      'utf8',
    );
    await fixture.commitAndPush('v2');

    const result = await syncCommand.execute({ targetDir: projectDir });

    expect(result.updatedFiles).toEqual(['AGENTS.md']);
    expect(result.createdFiles).toEqual(['.opencode/agents/new-agent.md']);
    expect(result.deletedFiles).toEqual(['.opencode/agents/old-agent.md']);
    expect(result.keptConflictFiles).toEqual([]);

    await expect(readFile(join(projectDir, 'AGENTS.md'), 'utf8')).resolves.toBe('# Base v2\n');
    await expect(
      readFile(join(projectDir, '.opencode', 'agents', 'new-agent.md'), 'utf8'),
    ).resolves.toBe(
      '---\nname: new-agent\ndescription: "Newly added agent"\n---\n\n# New Agent\n',
    );
    await expect(
      pathExists(join(projectDir, '.opencode', 'agents', 'old-agent.md')),
    ).resolves.toBe(false);
    await expect(readFile(projectCustomAgent, 'utf8')).resolves.toBe('# Project Only\n');
  });

  it('keeps locally modified conflicting files by default and overwrites them with --force', async () => {
    await initCommand.execute({
      targetDir: projectDir,
      harnessName: 'opencode',
      moduleIds: ['base'],
    });

    await writeFile(join(projectDir, 'AGENTS.md'), '# Local customization\n', 'utf8');
    await writeFile(join(fixture.workDir, 'modules', 'base', 'ROOT.md'), '# Base v2\n', 'utf8');
    await fixture.commitAndPush('v2');

    const defaultResult = await syncCommand.execute({ targetDir: projectDir });
    expect(defaultResult.keptConflictFiles).toEqual(['AGENTS.md']);
    await expect(readFile(join(projectDir, 'AGENTS.md'), 'utf8')).resolves.toBe(
      '# Local customization\n',
    );

    const forcedResult = await syncCommand.execute({ targetDir: projectDir, force: true });
    expect(forcedResult.updatedFiles).toEqual(['AGENTS.md']);
    expect(forcedResult.keptConflictFiles).toEqual([]);
    await expect(readFile(join(projectDir, 'AGENTS.md'), 'utf8')).resolves.toBe('# Base v2\n');
  });

  it('backs up local file to .bak and applies upstream when conflict resolution returns "backup"', async () => {
    await initCommand.execute({
      targetDir: projectDir,
      harnessName: 'opencode',
      moduleIds: ['base'],
    });

    await writeFile(join(projectDir, 'AGENTS.md'), '# Local edits\n', 'utf8');
    await writeFile(join(fixture.workDir, 'modules', 'base', 'ROOT.md'), '# Base v2\n', 'utf8');
    await fixture.commitAndPush('v2');

    const capturedConflicts: SyncConflict[] = [];
    const result = await syncCommand.execute({
      targetDir: projectDir,
      resolveConflict: async (conflict) => {
        capturedConflicts.push(conflict);
        return 'backup';
      },
    });

    expect(capturedConflicts).toEqual([
      {
        relativePath: 'AGENTS.md',
        localContent: '# Local edits\n',
        upstreamContent: '# Base v2\n',
      },
    ]);
    expect(result.backedUpFiles).toEqual(['AGENTS.md.bak']);
    expect(result.updatedFiles).toEqual(['AGENTS.md']);
    expect(result.keptConflictFiles).toEqual([]);
    await expect(readFile(join(projectDir, 'AGENTS.md.bak'), 'utf8')).resolves.toBe(
      '# Local edits\n',
    );
    await expect(readFile(join(projectDir, 'AGENTS.md'), 'utf8')).resolves.toBe('# Base v2\n');
  });
});
