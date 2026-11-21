import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectoryAgentHandler } from '../shared/directory-agent-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';

export class OpencodeHarness implements Harness {
  readonly name = 'opencode';
  readonly displayName = 'OpenCode';
  readonly aliases: readonly string[] = [];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.opencode', 'skills')),
    agents: AgentHandler = new DirectoryAgentHandler(join('.opencode', 'agents')),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler('AGENTS.md'),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
