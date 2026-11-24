import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentFrontmatterFormatter } from '../shared/agent-frontmatter-formatter.js';
import { mapOmittedCapabilities } from '../shared/capability-mapper.js';

const OPENCODE_PERMISSION_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: [],
  edit: ['edit'],
  execute: ['bash'],
  skill: ['skill'],
  subagent: ['task'],
};

export class OpencodeAgentFormatter implements AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[] {
    const lines: string[] = [];

    if (agent.mode !== undefined) {
      lines.push(`mode: ${agent.mode}`);
    }

    const deniedPermissions = mapOmittedCapabilities(agent.capabilities, OPENCODE_PERMISSION_MAP);
    if (deniedPermissions.length > 0) {
      lines.push('permission:');
      for (const permission of deniedPermissions) {
        lines.push(`  ${permission}: deny`);
      }
    }

    return lines;
  }
}
