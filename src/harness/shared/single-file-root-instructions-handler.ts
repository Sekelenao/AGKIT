import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';

export class SingleFileRootInstructionsHandler implements RootInstructionsHandler {
  private readonly instructionsFilePath: string;

  constructor(instructionsFilePath: string) {
    this.instructionsFilePath = instructionsFilePath;
  }

  relativePath(): string {
    return this.instructionsFilePath;
  }

  async write(targetDir: string, content: string): Promise<string> {
    const relative = this.relativePath();
    const absolute = join(targetDir, relative);

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');

    return relative;
  }
}
