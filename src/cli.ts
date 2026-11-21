#!/usr/bin/env node
import { Command } from 'commander';
import type { CliCommand } from './command/cli-command.js';
import { InitCommand } from './command/init/init-command.js';
import { CliError } from './error/cli-error.js';
import { AntigravityHarness } from './harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from './harness/harness-registry.js';
import { OpencodeHarness } from './harness/opencode/opencode-harness.js';
import { InteractiveRunner } from './interactive/interactive-runner.js';
import { InquirerPromptService } from './prompt/inquirer-prompt-service.js';

const harnessRegistry = new HarnessRegistry([
  new OpencodeHarness(),
  new AntigravityHarness(),
]);
const initCommand = new InitCommand(harnessRegistry);
const interactiveRunner = new InteractiveRunner(
  harnessRegistry,
  new InquirerPromptService(),
  initCommand,
);

const commands: readonly CliCommand[] = [initCommand];

const program = new Command();

program
  .name('agkit')
  .description('CLI for managing enterprise AI harness templates')
  .version('0.1.0')
  .action(async (): Promise<void> => {
    const result = await interactiveRunner.run(process.cwd());

    for (const file of result.writtenFiles) {
      console.log(`Created ${file}`);
    }
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
