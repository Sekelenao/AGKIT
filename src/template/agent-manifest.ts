import { z } from 'zod';

export const AGENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const AGENT_CAPABILITIES = [
  'read',
  'edit',
  'execute',
  'skill',
  'subagent',
] as const;

export const agentCapabilitySchema = z.enum(AGENT_CAPABILITIES);

export type AgentCapability = z.infer<typeof agentCapabilitySchema>;

export const agentManifestSchema = z.object({
  display_name: z.string().trim().min(1, 'display_name must not be empty'),
  description: z.string().trim().min(1, 'description must not be empty'),
  when_to_use: z.string().trim().min(1, 'when_to_use must not be empty').optional(),
  capabilities: z
    .array(agentCapabilitySchema)
    .min(1, 'capabilities must contain at least one entry')
    .optional()
    .default([...AGENT_CAPABILITIES]),
  file_regex: z.string().trim().min(1, 'file_regex must not be empty').optional(),
});

export type AgentManifest = Readonly<z.infer<typeof agentManifestSchema>>;
