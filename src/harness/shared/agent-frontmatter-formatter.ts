import type { TemplateAgent } from '../../template/template-module.js';

export interface AgentFrontmatterFormatter {
  formatExtraLines(agent: TemplateAgent): readonly string[];
}
