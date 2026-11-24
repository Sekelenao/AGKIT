import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentFrontmatterFormatter } from '../shared/agent-frontmatter-formatter.js';
import {
  hasRestrictedCapabilities,
  mapCapabilities,
} from '../shared/capability-mapper.js';

const COPILOT_TOOL_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: ['read', 'search'],
  edit: ['edit'],
  execute: ['execute'],
  skill: ['read'],
  subagent: ['agent'],
};

export class CopilotAgentFormatter implements AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[] {
    if (!hasRestrictedCapabilities(agent.capabilities)) {
      return [];
    }

    const tools = mapCapabilities(agent.capabilities, COPILOT_TOOL_MAP);
    if (tools.length === 0) {
      return [];
    }

    return ['tools:', ...tools.map((tool) => `  - ${tool}`)];
  }
}
