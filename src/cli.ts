#!/usr/bin/env node
import { Command } from 'commander';
import type { CliCommand } from './command/cli-command.js';
import { ConfigCommand } from './command/config/config-command.js';
import { InitCommand } from './command/init/init-command.js';
import { ResetCommand } from './command/reset/reset-command.js';
import { AgkitPaths } from './config/agkit-paths.js';
import { UserConfigStore } from './config/user-config-store.js';
import { CliError } from './error/cli-error.js';
import { GitRepositoryCache } from './git/git-repository-cache.js';
import { AntigravityHarness } from './harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from './harness/harness-registry.js';
import { OpencodeHarness } from './harness/opencode/opencode-harness.js';
import { InteractiveRunner } from './interactive/interactive-runner.js';
import { InquirerPromptService } from './prompt/inquirer-prompt-service.js';

const paths = new AgkitPaths();
const configStore = new UserConfigStore(paths);
const repositoryCache = new GitRepositoryCache(paths);
const harnessRegistry = new HarnessRegistry([
  new OpencodeHarness(),
  new AntigravityHarness(),
]);

const configCommand = new ConfigCommand(configStore, repositoryCache);
const initCommand = new InitCommand(harnessRegistry);
const resetCommand = new ResetCommand(paths);
const interactiveRunner = new InteractiveRunner(
  configStore,
  configCommand,
  harnessRegistry,
  new InquirerPromptService(),
  initCommand,
);

const commands: readonly CliCommand[] = [configCommand, initCommand, resetCommand];

const program = new Command();

program
  .name('agkit')
  .description('CLI for managing enterprise AI harness templates')
  .version('0.1.0')
  .action(async (): Promise<void> => {
    await interactiveRunner.run(process.cwd());
  });

for (const command of commands) {
  command.register(program);
}

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
}
