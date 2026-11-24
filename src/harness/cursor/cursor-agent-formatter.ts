import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentFrontmatterFormatter } from '../shared/agent-frontmatter-formatter.js';

export class CursorAgentFormatter implements AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[] {
    return agent.capabilities.includes('edit') ? [] : ['readonly: true'];
  }
}
