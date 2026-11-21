import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigCommand } from '../../src/command/config/config-command.js';
import { InitCommand } from '../../src/command/init/init-command.js';
import { AgkitPaths } from '../../src/config/agkit-paths.js';
import { UserConfigStore } from '../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../src/git/git-repository-cache.js';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { InteractiveRunner } from '../../src/interactive/interactive-runner.js';
import type { PromptChoice, PromptService } from '../../src/prompt/prompt-service.js';

async function createLocalRemoteRepo(baseDir: string): Promise<string> {
  const remoteDir = join(baseDir, 'templates.git');
  const workDir = join(baseDir, 'templates-work');

  await mkdir(remoteDir, { recursive: true });
  await mkdir(workDir, { recursive: true });
  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);
  await writeFile(join(workDir, 'README.md'), 'templates', 'utf8');
  await workGit.add('README.md');
  await workGit.commit('init');
  await workGit.push(['-u', 'origin', 'main']);

  return remoteDir;
}

describe('InteractiveRunner', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);
  const initCommand = new InitCommand(harnessRegistry);

  let tempDir: string;
  let configStore: UserConfigStore;
  let configCommand: ConfigCommand;
  let remoteRepoUrl: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-interactive-'));
    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    configStore = new UserConfigStore(paths);
    configCommand = new ConfigCommand(configStore, new GitRepositoryCache(paths));
    remoteRepoUrl = await createLocalRemoteRepo(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('runs first-time configuration when unconfigured, then shows menu and executes init', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    let capturedActions: readonly PromptChoice[] = [];
    let capturedHarnesses: readonly PromptChoice[] = [];
    let repoPromptCount = 0;

    const stubPrompt: PromptService = {
      async inputRepoUrl(): Promise<string> {
        repoPromptCount += 1;
        return remoteRepoUrl;
      },
      async inputDefaultRef(): Promise<string | undefined> {
        return undefined;
      },
      async selectAction(choices: readonly PromptChoice[]): Promise<string> {
        capturedActions = choices;
        return 'init';
      },
      async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
        capturedHarnesses = choices;
        return 'antigravity';
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
    );

    await runner.run(projectDir);

    expect(repoPromptCount).toBe(1);
    expect(await configStore.load()).toEqual({
      git_repository_url: remoteRepoUrl,
    });
    expect(capturedActions.map((c) => c.label)).toEqual([
      'Initialize a project',
      'Configure template repository',
    ]);
    expect(capturedHarnesses.map((c) => c.label)).toEqual([
      'OpenCode',
      'Antigravity',
    ]);

    const skillFile = join(projectDir, '.agents', 'skills', 'example', 'SKILL.md');
    expect(await readFile(skillFile, 'utf8')).toContain('name: example');
  });

  it('skips initial setup when already configured and allows reconfiguring from menu', async () => {
    await configStore.save({
      git_repository_url: remoteRepoUrl,
      default_ref: 'main',
    });

    let receivedCurrentUrl: string | undefined;
    let receivedCurrentRef: string | undefined;

    const stubPrompt: PromptService = {
      async inputRepoUrl(currentUrl?: string): Promise<string> {
        receivedCurrentUrl = currentUrl;
        return remoteRepoUrl;
      },
      async inputDefaultRef(currentRef?: string): Promise<string | undefined> {
        receivedCurrentRef = currentRef;
        return undefined;
      },
      async selectAction(): Promise<string> {
        return 'config';
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
    );

    await runner.run(tempDir);

    expect(receivedCurrentUrl).toBe(remoteRepoUrl);
    expect(receivedCurrentRef).toBe('main');
    expect(await configStore.load()).toEqual({
      git_repository_url: remoteRepoUrl,
    });
  });
});
