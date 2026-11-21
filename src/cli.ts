#!/usr/bin/env node
import { Command } from 'commander';
import { opencodeHarness } from './harness/opencode/opencode-harness.js';
import { initProject } from './command/init/init.js';

const program = new Command();

program
  .name('agkit')
  .description('CLI for managing enterprise AI harness templates')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize AI templates in the current project')
  .action(async (): Promise<void> => {
    const result = await initProject({
      targetDir: process.cwd(),
      harness: opencodeHarness,
    });

    for (const file of result.writtenFiles) {
      console.log(`Created ${file}`);
    }
  });

await program.parseAsync(process.argv);
