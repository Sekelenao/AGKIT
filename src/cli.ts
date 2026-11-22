#!/usr/bin/env node
import { Command } from 'commander';
import type { CliCommand } from './command/cli-command.js';
import { ConfigCommand } from './command/config/config-command.js';
import { InitCommand } from './command/init/init-command.js';
import { ListCommand } from './command/list/list-command.js';
import { NewCommand } from './command/new/new-command.js';
import { ResetCommand } from './command/reset/reset-command.js';
import { SpecCommand } from './command/spec/spec-command.js';
import { SyncCommand } from './command/sync/sync-command.js';
import { AgkitPaths } from './config/agkit-paths.js';
import { PackageVersionReader } from './config/package-version-reader.js';
import { UserConfigStore } from './config/user-config-store.js';
import { CliError } from './error/cli-error.js';
import { GitRepositoryCache } from './git/git-repository-cache.js';
import { AntigravityHarness } from './harness/antigravity/antigravity-harness.js';
import { BobHarness } from './harness/bob/bob-harness.js';
import { ClaudeHarness } from './harness/claude/claude-harness.js';
import { CodexHarness } from './harness/codex/codex-harness.js';
import { HarnessRegistry } from './harness/harness-registry.js';
import { OpencodeHarness } from './harness/opencode/opencode-harness.js';
import { InteractiveRunner } from './interactive/interactive-runner.js';
import { ContentHasher } from './manifest/content-hasher.js';
import { ProjectManifestStore } from './manifest/project-manifest-store.js';
import { InquirerPromptService } from './prompt/inquirer-prompt-service.js';
import { ModuleComposer } from './template/module-composer.js';
import { TemplateRepositoryLoader } from './template/template-repository-loader.js';
import { AlternateScreen } from './ui/alternate-screen.js';
import { BannerRenderer } from './ui/banner-renderer.js';
import { OutputFormatter } from './ui/output-formatter.js';
import { TerminalSpinner } from './ui/terminal-spinner.js';

const cliVersion = await new PackageVersionReader().read();
const stdoutFormatter = new OutputFormatter(process.stdout.isTTY === true);
const stderrFormatter = new OutputFormatter(process.stderr.isTTY === true);

const paths = new AgkitPaths();
const configStore = new UserConfigStore(paths);
const alternateScreen = new AlternateScreen();
const bannerRenderer = new BannerRenderer(cliVersion);
const progressReporter = new TerminalSpinner();
const repositoryCache = new GitRepositoryCache(paths, progressReporter);
const templateLoader = new TemplateRepositoryLoader();
const moduleComposer = new ModuleComposer();
const manifestStore = new ProjectManifestStore();
const contentHasher = new ContentHasher();
const harnessRegistry = new HarnessRegistry([
  new OpencodeHarness(),
  new AntigravityHarness(),
  new ClaudeHarness(),
  new CodexHarness(),
  new BobHarness(),
]);

const configCommand = new ConfigCommand(configStore, repositoryCache, stdoutFormatter);
const initCommand = new InitCommand(
  harnessRegistry,
  configStore,
  repositoryCache,
  templateLoader,
  moduleComposer,
  manifestStore,
  contentHasher,
  stdoutFormatter,
);
const listCommand = new ListCommand(
  configStore,
  repositoryCache,
  templateLoader,
  stdoutFormatter,
);
const syncCommand = new SyncCommand(
  harnessRegistry,
  repositoryCache,
  templateLoader,
  moduleComposer,
  manifestStore,
  contentHasher,
  stdoutFormatter,
);
const newCommand = new NewCommand(harnessRegistry, stdoutFormatter);
const resetCommand = new ResetCommand(paths, stdoutFormatter);
const specCommand = new SpecCommand(undefined, stdoutFormatter);
const promptService = new InquirerPromptService();
const interactiveRunner = new InteractiveRunner(
  configStore,
  configCommand,
  listCommand,
  harnessRegistry,
  promptService,
  initCommand,
  syncCommand,
  stdoutFormatter,
  newCommand,
  bannerRenderer,
  alternateScreen,
);

const commands: readonly CliCommand[] = [
  configCommand,
  initCommand,
  listCommand,
  newCommand,
  syncCommand,
  resetCommand,
  specCommand,
];

const program = new Command();

program
  .name('agkit')
  .description('CLI for managing enterprise AI harness templates')
  .version(cliVersion)
  .action(async (): Promise<void> => {
    const cwd = process.cwd();
    const summaryLines = await alternateScreen.run(() => interactiveRunner.run(cwd));
    for (const line of summaryLines) {
      console.log(line);
    }
  });

for (const command of commands) {
  command.register(program);
}

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  if (error instanceof CliError) {
    console.error(stderrFormatter.formatError(error.message));
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
}
