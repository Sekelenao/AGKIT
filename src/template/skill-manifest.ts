import { z } from 'zod';

export const SKILL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const skillManifestSchema = z.object({
  description: z.string().trim().min(1, 'description must not be empty'),
});

export type SkillManifest = Readonly<z.infer<typeof skillManifestSchema>>;
