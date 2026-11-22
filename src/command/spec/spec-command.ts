import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Command } from 'commander';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';

const DEFAULT_SPEC_PATH = fileURLToPath(
  new URL('../../../docs/template-repository.md', import.meta.url),
);

export class SpecCommand implements CliCommand {
  private readonly specFilePath: string;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    specFilePath: string = DEFAULT_SPEC_PATH,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.specFilePath = specFilePath;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('spec')
      .description('Print the template repository specification')
      .action(async (): Promise<void> => {
        const content = await this.execute();
        process.stdout.write(this.outputFormatter.formatMarkdownDocument(content));
      });
  }

  async execute(): Promise<string> {
    return readFile(this.specFilePath, 'utf8');
  }
}
