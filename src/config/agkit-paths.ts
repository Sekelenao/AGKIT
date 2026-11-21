import { homedir } from 'node:os';
import { join } from 'node:path';

export class AgkitPaths {
  readonly rootDir: string;

  constructor(rootDir: string = join(homedir(), '.agkit')) {
    this.rootDir = rootDir;
  }

  get configFilePath(): string {
    return join(this.rootDir, 'config.json');
  }

  get repoCacheDir(): string {
    return join(this.rootDir, 'cache', 'repo');
  }
}
