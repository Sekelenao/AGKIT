import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectoryAgentHandler } from '../shared/directory-agent-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';

export class CopilotHarness implements Harness {
  readonly name = 'copilot';
  readonly displayName = 'GitHub Copilot';
  readonly aliases: readonly string[] = ['github-copilot'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.github', 'skills')),
    agents: AgentHandler = new DirectoryAgentHandler(join('.github', 'agents'), '.agent.md'),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler(
      join('.github', 'copilot-instructions.md'),
    ),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
