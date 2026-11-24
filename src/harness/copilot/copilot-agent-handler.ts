import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  AGENT_CAPABILITIES,
  type AgentCapability,
} from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_COPILOT_AGENTS_DIR = join('.github', 'agents');
const DEFAULT_COPILOT_AGENT_EXTENSION = '.agent.md';

const COPILOT_TOOL_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: ['read', 'search'],
  edit: ['edit'],
  execute: ['execute'],
  skill: ['read'],
  subagent: ['agent'],
};

export class CopilotAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;
  private readonly fileExtension: string;

  constructor(
    agentsRootDir: string = DEFAULT_COPILOT_AGENTS_DIR,
    fileExtension: string = DEFAULT_COPILOT_AGENT_EXTENSION,
  ) {
    this.agentsRootDir = agentsRootDir;
    this.fileExtension = fileExtension;
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

    if (this.isRestricted(agent.capabilities)) {
      const tools = this.mapCapabilitiesToTools(agent.capabilities);
      if (tools.length > 0) {
        frontmatterLines.push('tools:');
        for (const tool of tools) {
          frontmatterLines.push(`  - ${tool}`);
        }
      }
    }

    frontmatterLines.push('---');

    const frontmatter = frontmatterLines.join('\n');
    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }

  private isRestricted(capabilities: readonly AgentCapability[]): boolean {
    const granted = new Set<AgentCapability>(capabilities);
    return AGENT_CAPABILITIES.some((capability) => !granted.has(capability));
  }

  private mapCapabilitiesToTools(capabilities: readonly AgentCapability[]): readonly string[] {
    const seen = new Set<string>();
    const tools: string[] = [];

    for (const capability of capabilities) {
      for (const tool of COPILOT_TOOL_MAP[capability]) {
        if (!seen.has(tool)) {
          seen.add(tool);
          tools.push(tool);
        }
      }
    }

    return tools;
  }
}
