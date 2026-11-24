import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentFrontmatterFormatter } from '../shared/agent-frontmatter-formatter.js';
import { mapOmittedCapabilities } from '../shared/capability-mapper.js';

const CLAUDE_TOOL_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: ['Read', 'Grep', 'Glob'],
  edit: ['Edit', 'Write'],
  execute: ['Bash'],
  skill: ['Skill'],
  subagent: ['Agent'],
};

export class ClaudeAgentFormatter implements AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[] {
    const lines: string[] = [];
    const disallowedTools = mapOmittedCapabilities(agent.capabilities, CLAUDE_TOOL_MAP);

    if (disallowedTools.length > 0) {
      lines.push('disallowedTools:');
      for (const tool of disallowedTools) {
        lines.push(`  - ${tool}`);
      }
    }

    if (agent.skills !== undefined && agent.skills.length > 0) {
      lines.push('skills:');
      for (const skillId of new Set(agent.skills)) {
        lines.push(`  - ${skillId}`);
      }
    }

    return lines;
  }
}
