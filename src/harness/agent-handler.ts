export interface AgentHandler {
  relativePath(agentName: string): string;
  write(targetDir: string, agentName: string, content: string): Promise<string>;
}
