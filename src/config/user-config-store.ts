import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AgkitPaths } from './agkit-paths.js';
import { InvalidConfigError } from './invalid-config-error.js';
import { type UserConfig, userConfigSchema } from './user-config.js';

export class UserConfigStore {
  private readonly paths: AgkitPaths;

  constructor(paths: AgkitPaths) {
    this.paths = paths;
  }

  async load(): Promise<UserConfig | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.paths.configFilePath, 'utf8');
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error: unknown) {
      throw new InvalidConfigError(
        `Invalid JSON in ${this.paths.configFilePath}.`,
        { cause: error },
      );
    }

    return this.parse(parsed);
  }

  async save(config: UserConfig): Promise<void> {
    const validated = this.parse(config);
    await mkdir(dirname(this.paths.configFilePath), { recursive: true });
    await writeFile(
      this.paths.configFilePath,
      `${JSON.stringify(validated, null, 2)}\n`,
      'utf8',
    );
  }

  private parse(value: unknown): UserConfig {
    const result = userConfigSchema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
        .join('; ');
      throw new InvalidConfigError(`Invalid configuration: ${message}`);
    }
    return result.data;
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
