import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_CURSOR_AGENTS_DIR = join('.cursor', 'agents');

export class CursorAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;

  constructor(agentsRootDir: string = DEFAULT_CURSOR_AGENTS_DIR) {
    this.agentsRootDir = agentsRootDir;
  }

  render(agents: readonly TemplateAgent[]): readonly RenderedFile[] {
    return agents.map((agent) => ({
      relativePath: join(this.agentsRootDir, `${agent.name}.md`),
      content: this.formatAgentMarkdown(agent),
    }));
  }

  async writeAll(
    targetDir: string,
    agents: readonly TemplateAgent[],
  ): Promise<readonly RenderedFile[]> {
    const rendered = this.render(agents);

    for (const file of rendered) {
      const absolute = join(targetDir, file.relativePath);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, 'utf8');
    }

    return rendered;
  }

  private formatAgentMarkdown(agent: TemplateAgent): string {
    const body = agent.prompt.replace(/\r\n/g, '\n').trim();
    const frontmatterLines = [
      '---',
      `name: ${agent.name}`,
      `description: ${JSON.stringify(agent.description)}`,
    ];

    if (!agent.capabilities.includes('edit')) {
      frontmatterLines.push('readonly: true');
    }

    frontmatterLines.push('---');

    const frontmatter = frontmatterLines.join('\n');
    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }
}
