import { z } from 'zod';

export const userConfigSchema = z.object({
  git_repository_url: z.string().trim().min(1, 'Repository URL is required.'),
  default_ref: z.string().trim().min(1).optional(),
});

export type UserConfig = Readonly<z.infer<typeof userConfigSchema>>;
