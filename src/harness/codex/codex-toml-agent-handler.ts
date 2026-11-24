import { join } from 'node:path';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';
import { RenderedFileWriter } from '../shared/rendered-file-writer.js';

const DEFAULT_CODEX_AGENTS_DIR = join('.codex', 'agents');

export class CodexTomlAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;
  private readonly fileWriter: RenderedFileWriter;

  constructor(
    agentsRootDir: string = DEFAULT_CODEX_AGENTS_DIR,
    fileWriter: RenderedFileWriter = new RenderedFileWriter(),
  ) {
    this.agentsRootDir = agentsRootDir;
    this.fileWriter = fileWriter;
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
    return this.fileWriter.writeAll(targetDir, this.render(agents));
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
