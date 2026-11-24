import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_CODEX_AGENTS_DIR = join('.codex', 'agents');

export class CodexTomlAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;

  constructor(agentsRootDir: string = DEFAULT_CODEX_AGENTS_DIR) {
    this.agentsRootDir = agentsRootDir;
  }

  render(agents: readonly TemplateAgent[]): readonly RenderedFile[] {
    return agents.map((agent) => ({
      relativePath: join(this.agentsRootDir, `${agent.name}.toml`),
      content: this.formatAgentToml(agent),
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

  private formatAgentToml(agent: TemplateAgent): string {
    const sandboxMode = agent.capabilities.includes('edit') ? 'workspace-write' : 'read-only';
    const body = agent.prompt.replace(/\r\n/g, '\n').trim();
    const lines = [
      `name = ${JSON.stringify(agent.name)}`,
      `description = ${JSON.stringify(agent.description)}`,
      `sandbox_mode = ${JSON.stringify(sandboxMode)}`,
      `developer_instructions = ${this.formatTomlMultilineString(body)}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  private formatTomlMultilineString(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
    if (escaped.length === 0) {
      return '""';
    }
    return `"""\n${escaped}\n"""`;
  }
}
