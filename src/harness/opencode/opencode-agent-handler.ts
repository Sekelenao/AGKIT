import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_OPENCODE_AGENTS_DIR = join('.opencode', 'agents');

const OPENCODE_DENYABLE_CAPABILITIES: readonly (readonly [AgentCapability, string])[] = [
  ['edit', 'edit'],
  ['execute', 'bash'],
  ['skill', 'skill'],
  ['subagent', 'task'],
];

export class OpencodeAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;

  constructor(agentsRootDir: string = DEFAULT_OPENCODE_AGENTS_DIR) {
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
    const deniedPermissions = this.resolveDeniedPermissions(agent.capabilities);
    const frontmatterLines = [
      '---',
      `name: ${agent.name}`,
      `description: ${JSON.stringify(agent.description)}`,
    ];

    if (agent.mode !== undefined) {
      frontmatterLines.push(`mode: ${agent.mode}`);
    }

    if (deniedPermissions.length > 0) {
      frontmatterLines.push('permission:');
      for (const permission of deniedPermissions) {
        frontmatterLines.push(`  ${permission}: deny`);
      }
    }

    frontmatterLines.push('---');

    const frontmatter = frontmatterLines.join('\n');
    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }

  private resolveDeniedPermissions(capabilities: readonly AgentCapability[]): readonly string[] {
    const allowed = new Set<AgentCapability>(capabilities);
    const denied: string[] = [];

    for (const [capability, permissionName] of OPENCODE_DENYABLE_CAPABILITIES) {
      if (!allowed.has(capability)) {
        denied.push(permissionName);
      }
    }

    return denied;
  }
}
