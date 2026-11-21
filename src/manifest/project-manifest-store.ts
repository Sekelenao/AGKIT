import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { InvalidManifestError } from './invalid-manifest-error.js';
import {
  PROJECT_MANIFEST_FILE_NAME,
  type ProjectManifest,
  projectManifestSchema,
} from './project-manifest.js';

export class ProjectManifestStore {
  manifestPath(targetDir: string): string {
    return join(targetDir, PROJECT_MANIFEST_FILE_NAME);
  }

  async load(targetDir: string): Promise<ProjectManifest | undefined> {
    const filePath = this.manifestPath(targetDir);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf8');
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
      throw new InvalidManifestError(`Invalid JSON in ${filePath}.`, { cause: error });
    }

    return this.parse(parsed);
  }

  async save(targetDir: string, manifest: ProjectManifest): Promise<string> {
    const validated = this.parse(manifest);
    const sortedManagedFiles: Record<string, string> = {};
    const sortedKeys = Object.keys(validated.managed_files).sort((a, b) =>
      a.localeCompare(b),
    );
    for (const key of sortedKeys) {
      const value = validated.managed_files[key];
      if (value !== undefined) {
        sortedManagedFiles[key] = value;
      }
    }

    const ordered: ProjectManifest = {
      harness: validated.harness,
      modules: validated.modules,
      git_repository_url: validated.git_repository_url,
      ...(validated.ref === undefined ? {} : { ref: validated.ref }),
      managed_files: sortedManagedFiles,
    };

    await writeFile(
      this.manifestPath(targetDir),
      `${JSON.stringify(ordered, null, 2)}\n`,
      'utf8',
    );

    return PROJECT_MANIFEST_FILE_NAME;
  }

  private parse(value: unknown): ProjectManifest {
    const result = projectManifestSchema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`)
        .join('; ');
      throw new InvalidManifestError(`Invalid ${PROJECT_MANIFEST_FILE_NAME}: ${details}`);
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
