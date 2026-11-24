import { join } from 'node:path';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';
import type { AgentFrontmatterFormatter } from './agent-frontmatter-formatter.js';
import { RenderedFileWriter } from './rendered-file-writer.js';

export class MarkdownAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;
  private readonly formatter: AgentFrontmatterFormatter;
  private readonly fileExtension: string;
  private readonly fileWriter: RenderedFileWriter;

  constructor(
    agentsRootDir: string,
    formatter: AgentFrontmatterFormatter,
    fileExtension = '.md',
    fileWriter: RenderedFileWriter = new RenderedFileWriter(),
  ) {
    this.agentsRootDir = agentsRootDir;
    this.formatter = formatter;
    this.fileExtension = fileExtension;
    this.fileWriter = fileWriter;
  }

  render(agents: readonly TemplateAgent[]): readonly RenderedFile[] {
    return agents.map((agent) => ({
      relativePath: join(this.agentsRootDir, `${agent.name}${this.fileExtension}`),
      content: this.formatAgentMarkdown(agent),
    }));
  }

  async writeAll(
    targetDir: string,
    agents: readonly TemplateAgent[],
  ): Promise<readonly RenderedFile[]> {
    return this.fileWriter.writeAll(targetDir, this.render(agents));
  }

  private formatAgentMarkdown(agent: TemplateAgent): string {
    const body = agent.prompt.replace(/\r\n/g, '\n').trim();
    const frontmatterLines = [
      '---',
      `name: ${agent.name}`,
      `description: ${JSON.stringify(agent.description)}`,
      ...this.formatter.formatExtraLines(agent),
      '---',
    ];

    const frontmatter = frontmatterLines.join('\n');
    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }
}
