import {
  AGENT_CAPABILITIES,
  type AgentCapability,
} from '../../template/agent-manifest.js';

export function hasRestrictedCapabilities(capabilities: readonly AgentCapability[]): boolean {
  const granted = new Set<AgentCapability>(capabilities);
  return AGENT_CAPABILITIES.some((capability) => !granted.has(capability));
}

export function mapCapabilities(
  capabilities: readonly AgentCapability[],
  mapping: Readonly<Record<AgentCapability, readonly string[]>>,
): readonly string[] {
  const seen = new Set<string>();
  const mapped: string[] = [];

  for (const capability of capabilities) {
    for (const entry of mapping[capability]) {
      if (!seen.has(entry)) {
        seen.add(entry);
        mapped.push(entry);
      }
    }
  }

  return mapped;
}

export function mapOmittedCapabilities(
  capabilities: readonly AgentCapability[],
  mapping: Readonly<Record<AgentCapability, readonly string[]>>,
): readonly string[] {
  const granted = new Set<AgentCapability>(capabilities);
  const omitted = AGENT_CAPABILITIES.filter((capability) => !granted.has(capability));
  return mapCapabilities(omitted, mapping);
}
