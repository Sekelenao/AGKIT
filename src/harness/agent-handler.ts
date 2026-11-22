import type { TemplateAgent } from '../template/template-module.js';
import type { RenderedFile } from './rendered-file.js';

export interface AgentHandler {
  render(agents: readonly TemplateAgent[]): readonly RenderedFile[];
  writeAll(
    targetDir: string,
    agents: readonly TemplateAgent[],
  ): Promise<readonly RenderedFile[]>;
}
