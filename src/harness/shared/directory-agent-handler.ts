import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';

export class DirectoryAgentHandler implements AgentHandler {
  private readonly agentsRootDir: string;

  constructor(agentsRootDir: string) {
    this.agentsRootDir = agentsRootDir;
  }

  relativePath(agentName: string): string {
    return join(this.agentsRootDir, `${agentName}.md`);
  }

  async write(targetDir: string, agentName: string, content: string): Promise<string> {
    const relative = this.relativePath(agentName);
    const absolute = join(targetDir, relative);

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');

    return relative;
  }
}
