import { z } from 'zod';
import { MODULE_ID_PATTERN } from '../template/module-manifest.js';

export const PROJECT_MANIFEST_FILE_NAME = '.agkit.json';

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

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
  git_repository_url: z.string().trim().min(1, 'git_repository_url must not be empty'),
  ref: z.string().trim().min(1, 'ref must not be empty').optional(),
  managed_files: z.record(
    z.string().trim().min(1, 'managed_files path must not be empty'),
    z.string().regex(SHA256_HEX_PATTERN, 'managed_files hash must be a sha256 hex digest'),
  ),
});

export type ProjectManifest = Readonly<z.infer<typeof projectManifestSchema>>;
