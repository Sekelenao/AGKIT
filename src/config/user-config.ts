import { z } from 'zod';

export const userConfigSchema = z.object({
  git_repository_url: z
    .string()
    .trim()
    .min(1, 'Repository URL is required.')
    .refine((value) => !value.startsWith('-'), 'Repository URL must not start with "-".'),
  default_ref: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !value.startsWith('-'), 'Default ref must not start with "-".')
    .optional(),
});

export type UserConfig = Readonly<z.infer<typeof userConfigSchema>>;
