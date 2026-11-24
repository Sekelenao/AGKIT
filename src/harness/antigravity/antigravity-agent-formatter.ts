import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentFrontmatterFormatter } from '../shared/agent-frontmatter-formatter.js';
import {
  hasRestrictedCapabilities,
  mapCapabilities,
} from '../shared/capability-mapper.js';

const ANTIGRAVITY_CLI_TOOL_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: ['read_file'],
  edit: ['write_file', 'edit_file'],
  execute: ['run_command', 'manage_task'],
  skill: ['read_file'],
  subagent: ['invoke_subagent', 'send_message'],
};

export class AntigravityAgentFormatter implements AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[] {
    const lines: string[] = [];

    if (hasRestrictedCapabilities(agent.capabilities)) {
      const tools = mapCapabilities(agent.capabilities, ANTIGRAVITY_CLI_TOOL_MAP);
      if (tools.length > 0) {
        lines.push('tools:');
        for (const tool of tools) {
          lines.push(`  - ${tool}`);
        }
      }
    }

    if (agent.mode === 'subagent') {
      lines.push('subagent: true', 'mainAgent: false');
    } else if (agent.mode === 'primary') {
      lines.push('subagent: false', 'mainAgent: true');
    } else if (agent.mode === 'all') {
      lines.push('subagent: true', 'mainAgent: true');
    }

    if (agent.skills !== undefined && agent.skills.length > 0) {
      lines.push('skills:');
      for (const skillId of new Set(agent.skills)) {
        lines.push(`  - skills/${skillId}`);
      }
    }

    return lines;
  }
}
