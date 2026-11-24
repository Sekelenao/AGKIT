import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { MarkdownAgentHandler } from '../shared/markdown-agent-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';
import { AntigravityAgentFormatter } from './antigravity-agent-formatter.js';

export class AntigravityHarness implements Harness {
  readonly name = 'antigravity';
  readonly displayName = 'Antigravity CLI';
  readonly aliases: readonly string[] = ['agy'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.agents', 'skills')),
    agents: AgentHandler = new MarkdownAgentHandler(
      join('.agents', 'agents'),
      new AntigravityAgentFormatter(),
    ),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler('AGENTS.md'),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
