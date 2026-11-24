import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigCommand } from '../../src/command/config/config-command.js';
import { InitCommand } from '../../src/command/init/init-command.js';
import { ListCommand } from '../../src/command/list/list-command.js';
import { NewCommand } from '../../src/command/new/new-command.js';
import { type ConflictResolution, SyncCommand } from '../../src/command/sync/sync-command.js';
import { AgkitPaths } from '../../src/config/agkit-paths.js';
import { UserConfigStore } from '../../src/config/user-config-store.js';
import { GitRepositoryCache } from '../../src/git/git-repository-cache.js';
import { AntigravityHarness } from '../../src/harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from '../../src/harness/harness-registry.js';
import { OpencodeHarness } from '../../src/harness/opencode/opencode-harness.js';
import { InteractiveRunner } from '../../src/interactive/interactive-runner.js';
import { ContentHasher } from '../../src/manifest/content-hasher.js';
import { ProjectManifestStore } from '../../src/manifest/project-manifest-store.js';
import { PromptCancelledError } from '../../src/prompt/prompt-cancelled-error.js';
import type { PromptChoice, PromptService } from '../../src/prompt/prompt-service.js';
import { ModuleComposer } from '../../src/template/module-composer.js';
import { TemplateRepositoryLoader } from '../../src/template/template-repository-loader.js';
import { AlternateScreen } from '../../src/ui/alternate-screen.js';
import { OutputFormatter } from '../../src/ui/output-formatter.js';

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
    join(workDir, 'modules', 'base', 'skills', 'example', 'skill.json'),
    JSON.stringify({ description: 'Example skill' }),
    'utf8',
  );
  await writeFile(
    join(workDir, 'modules', 'base', 'skills', 'example', 'SKILL.md'),
    '# Example Skill\n',
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
  let syncCommand: SyncCommand;
  let remoteRepoUrl: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agkit-interactive-'));
    const paths = new AgkitPaths(join(tempDir, '.agkit'));
    const repositoryCache = new GitRepositoryCache(paths);
    const templateLoader = new TemplateRepositoryLoader();
    const moduleComposer = new ModuleComposer();
    const manifestStore = new ProjectManifestStore();
    const contentHasher = new ContentHasher();

    configStore = new UserConfigStore(paths);
    configCommand = new ConfigCommand(configStore, repositoryCache);
    listCommand = new ListCommand(configStore, repositoryCache, templateLoader);
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
    remoteRepoUrl = await createLocalRemoteRepo(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('runs first-time configuration when unconfigured, executes init, and stays in menu until exit', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    let capturedActions: readonly PromptChoice[] = [];
    let capturedModules: readonly PromptChoice[] = [];
    let capturedHarnesses: readonly PromptChoice[] = [];
    let repoPromptCount = 0;
    const queuedActions = ['init', 'exit'];

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
        return queuedActions.shift() ?? 'exit';
      },
      async selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]> {
        capturedModules = choices;
        return ['base'];
      },
      async selectHarness(choices: readonly PromptChoice[]): Promise<string> {
        capturedHarnesses = choices;
        return 'antigravity';
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
    );

    await runner.run(projectDir);

    expect(repoPromptCount).toBe(1);
    expect(await configStore.load()).toEqual({
      git_repository_url: remoteRepoUrl,
    });
    expect(capturedActions.map((c) => c.label)).toEqual([
      'Apply templates to this project',
      'Update templates in this project',
      'Create a template repository',
      'Configuration',
      'Exit',
    ]);
    expect(capturedModules.map((c) => c.value)).toEqual(['base']);
    expect(capturedHarnesses.map((c) => c.label)).toEqual([
      'OpenCode',
      'Antigravity CLI',
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
    const queuedActions = ['config', 'exit'];

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
        return queuedActions.shift() ?? 'exit';
      },
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
    );

    await runner.run(tempDir);

    expect(receivedCurrentUrl).toBe(remoteRepoUrl);
    expect(receivedCurrentRef).toBe('main');
    expect(await configStore.load()).toEqual({
      git_repository_url: remoteRepoUrl,
    });
  });

  it('catches CliError inside the interactive loop and displays it without exiting', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const projectDir = join(tempDir, 'uninitialized-project');
    await mkdir(projectDir, { recursive: true });

    const queuedActions = ['sync', 'exit'];
    const writtenChunks: string[] = [];
    const screen = new AlternateScreen({
      isTTY: false,
      write(chunk: string): boolean {
        writtenChunks.push(chunk);
        return true;
      },
    });

    const stubPrompt: PromptService = {
      async inputRepoUrl(): Promise<string> {
        throw new Error('inputRepoUrl should not be called');
      },
      async inputDefaultRef(): Promise<string | undefined> {
        throw new Error('inputDefaultRef should not be called');
      },
      async selectAction(): Promise<string> {
        return queuedActions.shift() ?? 'exit';
      },
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const outputFormatter = new OutputFormatter(false);
    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
      outputFormatter,
      new NewCommand(harnessRegistry, outputFormatter),
      undefined,
      screen,
    );

    await runner.run(projectDir);

    expect(writtenChunks.join('')).toContain('ERROR');
    expect(writtenChunks.join('')).toContain('.agkit.json');
  });

  it('scaffolds a new template repository for the selected harness without exiting the session', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const scaffoldDir = join(tempDir, 'new-template-repo');
    await mkdir(scaffoldDir, { recursive: true });

    const queuedActions = ['new', 'exit'];
    const stubPrompt: PromptService = {
      async inputRepoUrl(): Promise<string> {
        throw new Error('inputRepoUrl should not be called');
      },
      async inputDefaultRef(): Promise<string | undefined> {
        throw new Error('inputDefaultRef should not be called');
      },
      async selectAction(): Promise<string> {
        return queuedActions.shift() ?? 'exit';
      },
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        return 'opencode';
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const outputFormatter = new OutputFormatter(false);
    const writtenChunks: string[] = [];
    const shortScreen = new AlternateScreen({
      isTTY: true,
      rows: 22,
      write(chunk: string): boolean {
        writtenChunks.push(chunk);
        return true;
      },
    });
    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
      outputFormatter,
      new NewCommand(harnessRegistry, outputFormatter),
      undefined,
      shortScreen,
    );

    await runner.run(scaffoldDir);

    const skillContent = await readFile(
      join(scaffoldDir, '.opencode', 'skills', 'agkit-template-authoring', 'SKILL.md'),
      'utf8',
    );
    expect(skillContent).toContain('agkit spec');

    const renderedOutput = writtenChunks.join('');
    expect(renderedOutput).toContain('Created template repository (12 files)');
    expect(renderedOutput).toContain('… and 9 more');
  });

  it('returns to the menu when a sub-prompt is cancelled and exits cleanly on main menu cancel', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    let menuCallCount = 0;
    const stubPrompt: PromptService = {
      async inputRepoUrl(): Promise<string> {
        throw new PromptCancelledError();
      },
      async inputDefaultRef(): Promise<string | undefined> {
        throw new Error('inputDefaultRef should not be called');
      },
      async selectAction(): Promise<string> {
        menuCallCount += 1;
        if (menuCallCount === 1) {
          return 'config';
        }
        throw new PromptCancelledError();
      },
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
    );

    await expect(runner.run(tempDir)).resolves.toBeUndefined();
    expect(menuCallCount).toBe(2);
  });

  it('steps back to the previous form field when cancelling step 2 of init or config', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const projectDir = join(tempDir, 'backtrack-project');
    await mkdir(projectDir, { recursive: true });

    const queuedActions = ['config', 'init', 'exit'];
    let repoInputCalls = 0;
    let refInputCalls = 0;
    const seenRepoDefaults: (string | undefined)[] = [];
    let moduleSelectCalls = 0;
    let harnessSelectCalls = 0;

    const stubPrompt: PromptService = {
      async inputRepoUrl(currentUrl?: string): Promise<string> {
        repoInputCalls += 1;
        seenRepoDefaults.push(currentUrl);
        return remoteRepoUrl;
      },
      async inputDefaultRef(): Promise<string | undefined> {
        refInputCalls += 1;
        if (refInputCalls === 1) {
          throw new PromptCancelledError();
        }
        return 'main';
      },
      async selectAction(): Promise<string> {
        return queuedActions.shift() ?? 'exit';
      },
      async selectModules(): Promise<readonly string[]> {
        moduleSelectCalls += 1;
        return ['base'];
      },
      async selectHarness(): Promise<string> {
        harnessSelectCalls += 1;
        if (harnessSelectCalls === 1) {
          throw new PromptCancelledError();
        }
        return 'antigravity';
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
    );

    await runner.run(projectDir);

    expect(repoInputCalls).toBe(2);
    expect(refInputCalls).toBe(2);
    expect(seenRepoDefaults).toEqual([remoteRepoUrl, remoteRepoUrl]);
    expect(moduleSelectCalls).toBe(2);
    expect(harnessSelectCalls).toBe(2);
    expect(await readFile(join(projectDir, 'AGENTS.md'), 'utf8')).toBe('# Base Guide\n');
  });

  it('exits cleanly when Exit is selected from the menu', async () => {
    await configStore.save({ git_repository_url: remoteRepoUrl });

    const stubPrompt: PromptService = {
      async inputRepoUrl(): Promise<string> {
        throw new Error('inputRepoUrl should not be called');
      },
      async inputDefaultRef(): Promise<string | undefined> {
        throw new Error('inputDefaultRef should not be called');
      },
      async selectAction(): Promise<string> {
        return 'exit';
      },
      async selectModules(): Promise<readonly string[]> {
        throw new Error('selectModules should not be called');
      },
      async selectHarness(): Promise<string> {
        throw new Error('selectHarness should not be called');
      },
      async resolveConflict(): Promise<ConflictResolution> {
        throw new Error('resolveConflict should not be called');
      },
    };

    const runner = new InteractiveRunner(
      configStore,
      configCommand,
      listCommand,
      harnessRegistry,
      stubPrompt,
      initCommand,
      syncCommand,
    );

    await expect(runner.run(tempDir)).resolves.toBeUndefined();
  });
});
