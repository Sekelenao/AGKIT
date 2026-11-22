import { z } from 'zod';
import { MODULE_ID_PATTERN } from '../template/module-manifest.js';

export const PROJECT_MANIFEST_FILE_NAME = '.agkit.json';

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const WINDOWS_DRIVE_PREFIX = /^[a-zA-Z]:/;

function isSafeRelativePosixPath(value: string): boolean {
  if (
    value.length === 0 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    WINDOWS_DRIVE_PREFIX.test(value)
  ) {
    return false;
  }

  const segments = value.split('/');
  return segments.every(
    (segment) => segment.length > 0 && segment !== '.' && segment !== '..',
  );
}

export const projectManifestSchema = z.object({
  harness: z.string().trim().min(1, 'harness must not be empty'),
  modules: z
    .array(
      z
        .string()
        .trim()
        .regex(MODULE_ID_PATTERN, 'modules entries must be valid kebab-case module IDs'),
    )
    .min(1, 'modules must contain at least one module'),
  git_repository_url: z
    .string()
    .trim()
    .min(1, 'git_repository_url must not be empty')
    .refine((value) => !value.startsWith('-'), 'git_repository_url must not start with "-"'),
  ref: z
    .string()
    .trim()
    .min(1, 'ref must not be empty')
    .refine((value) => !value.startsWith('-'), 'ref must not start with "-"')
    .optional(),
  managed_files: z.record(
    z
      .string()
      .trim()
      .min(1, 'managed_files path must not be empty')
      .refine(
        isSafeRelativePosixPath,
        'managed_files path must be a safe relative POSIX path without ".." segments',
      ),
    z.string().regex(SHA256_HEX_PATTERN, 'managed_files hash must be a sha256 hex digest'),
  ),
});

export type ProjectManifest = Readonly<z.infer<typeof projectManifestSchema>>;
