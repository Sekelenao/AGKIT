import { z } from 'zod';

export const userConfigSchema = z.object({
  repoUrl: z.string().trim().min(1, 'Repository URL is required.'),
  defaultRef: z.string().trim().min(1).optional(),
});

export type UserConfig = Readonly<z.infer<typeof userConfigSchema>>;
