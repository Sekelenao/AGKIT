#!/usr/bin/env node
import { Command } from 'commander';
import { InitCommand } from './command/init/init.js';
import { AntigravityHarness } from './harness/antigravity/antigravity-harness.js';
import { HarnessRegistry } from './harness/harness-registry.js';
import { OpencodeHarness } from './harness/opencode/opencode-harness.js';
import { UnknownHarnessError } from './harness/unknown-harness-error.js';

interface InitCliOptions {
  readonly harness: string;
}

const harnessRegistry = new HarnessRegistry([
  new OpencodeHarness(),
  new AntigravityHarness(),
]);
const initCommand = new InitCommand();

const program = new Command();

program
  .name('agkit')
  .description('CLI for managing enterprise AI harness templates')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize AI templates in the current project')
  .option(
    '--harness <name>',
    `Target AI harness (${harnessRegistry.listNames().join(', ')})`,
    'opencode',
  )
  .action(async (options: InitCliOptions): Promise<void> => {
    try {
      const harness = harnessRegistry.resolve(options.harness);
      const result = await initCommand.execute({
        targetDir: process.cwd(),
        harness,
      });

      for (const file of result.writtenFiles) {
        console.log(`Created ${file}`);
      }
    } catch (error: unknown) {
      if (error instanceof UnknownHarnessError) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  });

await program.parseAsync(process.argv);
