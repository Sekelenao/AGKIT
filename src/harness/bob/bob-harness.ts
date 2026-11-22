import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';
import { BobCustomModesAgentHandler } from './bob-custom-modes-agent-handler.js';

export class BobHarness implements Harness {
  readonly name = 'bob';
  readonly displayName = 'IBM Bob';
  readonly aliases: readonly string[] = ['ibm-bob'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.bob', 'skills')),
    agents: AgentHandler = new BobCustomModesAgentHandler(),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler('AGENTS.md'),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
