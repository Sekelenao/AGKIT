import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  AGENT_CAPABILITIES,
  type AgentCapability,
} from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_CLAUDE_AGENTS_DIR = join('.claude', 'agents');

const CLAUDE_TOOL_MAP: Readonly<Record<AgentCapability, readonly string[]>> = {
  read: ['Read', 'Grep', 'Glob'],
  edit: ['Edit', 'Write'],
  execute: ['Bash'],
  skill: ['Skill'],
  subagent: ['Agent'],
};

export class ClaudeAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;

  constructor(agentsRootDir: string = DEFAULT_CLAUDE_AGENTS_DIR) {
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
    const disallowedTools = this.resolveDisallowedTools(agent.capabilities);
    const frontmatterLines = [
      '---',
      `name: ${agent.name}`,
      `description: ${JSON.stringify(agent.description)}`,
    ];

    if (disallowedTools.length > 0) {
      frontmatterLines.push('disallowedTools:');
      for (const tool of disallowedTools) {
        frontmatterLines.push(`  - ${tool}`);
      }
    }

    if (agent.skills !== undefined && agent.skills.length > 0) {
      const uniqueSkills = Array.from(new Set(agent.skills));
      frontmatterLines.push('skills:');
      for (const skillId of uniqueSkills) {
        frontmatterLines.push(`  - ${skillId}`);
      }
    }

    frontmatterLines.push('---');

    const frontmatter = frontmatterLines.join('\n');
    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }

  private resolveDisallowedTools(capabilities: readonly AgentCapability[]): readonly string[] {
    const granted = new Set<AgentCapability>(capabilities);
    const seen = new Set<string>();
    const disallowed: string[] = [];

    for (const capability of AGENT_CAPABILITIES) {
      if (granted.has(capability)) {
        continue;
      }
      for (const tool of CLAUDE_TOOL_MAP[capability]) {
        if (!seen.has(tool)) {
          seen.add(tool);
          disallowed.push(tool);
        }
      }
    }

    return disallowed;
  }
}
