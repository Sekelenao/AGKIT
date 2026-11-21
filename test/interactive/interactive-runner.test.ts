import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigCommand } from '../../src/command/config/config-command.js';
import { InitCommand } from '../../src/command/init/init-command.js';
import { ListCommand } from '../../src/command/list/list-command.js';
import { AgkitPaths } from '../../src/config/agkit-paths.js';
import { UserConfigStore } from '../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../src/git/git-repository-cache.js';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { InteractiveRunner } from '../../src/interactive/interactive-runner.js';
import type { PromptChoice, PromptService } from '../../src/prompt/prompt-service.js';
import { ModuleComposer } from '../../src/template/module-composer.js';
import { TemplateRepositoryLoader } from '../../src/template/template-repository-loader.js';

async function createLocalRemoteRepo(baseDir: string): Promise<string> {
  const remoteDir = join(baseDir, 'templates.git');
  const workDir = join(baseDir, 'templates-work');

  await mkdir(remoteDir, { recursive: true });
  await mkdir(join(workDir, 'modules', 'base', 'skills', 'example'), { recursive: true });
  await simpleGit(remoteDir).init(true, ['--initial-branch=main']);

  await writeFile(
    join(workDir, 'modules', 'base', 'module.json'),
    JSON.stringify({ display_name: 'Base', description: 'Shared company defaults' }),
    'utf8',
  );
  await writeFile(join(workDir, 'modules', 'base', 'ROOT.md'), '# Base Guide\n', 'utf8');
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'example', 'SKILL.md'),
    '---\nname: example\n---\n',
    'utf8',
  );

  const workGit = simpleGit(workDir);
  await workGit.init(['--initial-branch=main']);
  await workGit.addConfig('user.name', 'Test User');
  await workGit.addConfig('user.email', 'test@example.com');
  await workGit.addRemote('origin', remoteDir);
  await workGit.add('.');
  await workGit.commit('init');
  await workGit.push(['-u', 'origin', 'main']);

  return remoteDir;
}

describe('InteractiveRunner', () => {
  const harnessRegistry = new HarnessRegistry([
    new OpencodeHarness(),
    new AntigravityHarness(),
  ]);

  let tempDir: string;
  let configStore: UserConfigStore;
  let configCommand: ConfigCommand;
  let listCommand: ListCommand;
  let initCommand: InitCommand;
  let remoteRepoUrl: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-interactive-'));
    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    const repositoryCache = new GitRepositoryCache(paths);
    const templateLoader = new TemplateRepositoryLoader();

    configStore = new UserConfigStore(paths);
    configCommand = new ConfigCommand(configStore, repositoryCache);
    listCommand = new ListCommand(configStore, repositoryCache, templateLoader);
    initCommand = new InitCommand(
      harnessRegistry,
      configStore,
      repositoryCache,
      templateLoader,
      new ModuleComposer(),
    );
    remoteRepoUrl = await createLocalRemoteRepo(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('runs first-time configuration when unconfigured, then shows menu and executes init', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    let capturedActions: readonly PromptChoice[] = [];
    let capturedModules: readonly PromptChoice[] = [];
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
      async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
        capturedModules = choices;
        return ['base'];
      },
      async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
        capturedHarnesses = choices;
        return 'antigravity';
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
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
    expect(capturedModules.map((c) => c.value)).toEqual(['base']);
    expect(capturedHarnesses.map((c) => c.label)).toEqual([
      'OpenCode',
      'Antigravity',
    ]);

    expect(await readFile(join(projectDir, 'AGENTS.md'), 'utf8')).toBe('# Base Guide\n');
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
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
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
