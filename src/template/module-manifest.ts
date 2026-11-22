import { z } from 'zod';

export const MODULE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const moduleManifestSchema = z.object({
  display_name: z.string().trim().min(1, 'display_name must not be empty'),
  description: z.string().trim().min(1, 'description must not be empty'),
});

export type ModuleManifest = Readonly<z.infer<typeof moduleManifestSchema>>;
