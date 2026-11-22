import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AgentCapability } from '../../template/agent-manifest.js';
import type { TemplateAgent } from '../../template/template-module.js';
import type { AgentHandler } from '../agent-handler.js';
import type { RenderedFile } from '../rendered-file.js';

const DEFAULT_CUSTOM_MODES_PATH = join('.bob', 'custom_modes.yaml');

const BOB_GROUP_MAP: Readonly<Record<AgentCapability, string>> = {
  read: 'read',
  edit: 'edit',
  execute: 'execute',
  skill: 'skill',
  subagent: 'subagent',
};

export class BobCustomModesAgentHandler implements AgentHandler {
  private readonly relativeFilePath: string;

  constructor(relativeFilePath: string = DEFAULT_CUSTOM_MODES_PATH) {
    this.relativeFilePath = relativeFilePath;
  }

  render(agents: readonly TemplateAgent[]): readonly RenderedFile[] {
    if (agents.length === 0) {
      return [];
    }

    const lines: string[] = ['customModes:'];
    for (const agent of agents) {
      const whenToUse = agent.whenToUse ?? agent.description;
      const roleDefinition = agent.prompt.replace(/\r\n/g, '\n').trim();
      const groups = agent.capabilities.map((capability) => BOB_GROUP_MAP[capability]);

      lines.push(`  - slug: ${JSON.stringify(agent.name)}`);
      lines.push(`    name: ${JSON.stringify(agent.displayName)}`);
      lines.push(`    description: ${JSON.stringify(agent.description)}`);
      lines.push(`    whenToUse: ${JSON.stringify(whenToUse)}`);
      lines.push('    roleDefinition: |');
      for (const bodyLine of roleDefinition.split('\n')) {
        lines.push(bodyLine.length === 0 ? '' : `      ${bodyLine}`);
      }
      lines.push('    groups:');
      for (const group of groups) {
        lines.push(`      - ${group}`);
      }
      if (agent.fileRegex !== undefined) {
        lines.push(`    fileRegex: ${JSON.stringify(agent.fileRegex)}`);
      }
    }

    return [
      {
        relativePath: this.relativeFilePath,
        content: `${lines.join('\n')}\n`,
      },
    ];
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
}
