import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RenderedFile } from '../rendered-file.js';

export class RenderedFileWriter {
  async writeAll(
    targetDir: string,
    files: readonly RenderedFile[],
  ): Promise<readonly RenderedFile[]> {
    for (const file of files) {
      const absolute = join(targetDir, file.relativePath);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, 'utf8');
    }

    return files;
  }
}
