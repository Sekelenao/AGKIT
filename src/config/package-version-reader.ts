import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const packageVersionSchema = z.object({
  version: z.string().trim().min(1),
});

export class PackageVersionReader {
  private readonly packageJsonUrl: URL;

  constructor(packageJsonUrl: URL = new URL('../../package.json', import.meta.url)) {
    this.packageJsonUrl = packageJsonUrl;
  }

  async read(): Promise<string> {
    const raw = await readFile(this.packageJsonUrl, 'utf8');
    return packageVersionSchema.parse(JSON.parse(raw)).version;
  }
}
