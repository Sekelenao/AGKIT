import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { MarkdownAgentHandler } from '../shared/markdown-agent-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';
import { CopilotAgentFormatter } from './copilot-agent-formatter.js';

export class CopilotHarness implements Harness {
  readonly name = 'copilot';
  readonly displayName = 'GitHub Copilot';
  readonly aliases: readonly string[] = ['github-copilot'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.github', 'skills')),
    agents: AgentHandler = new MarkdownAgentHandler(
      join('.github', 'agents'),
      new CopilotAgentFormatter(),
      '.agent.md',
    ),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler(
      join('.github', 'copilot-instructions.md'),
    ),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
