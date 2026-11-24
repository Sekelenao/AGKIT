import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';
import { CodexTomlAgentHandler } from './codex-toml-agent-handler.js';

export class CodexHarness implements Harness {
  readonly name = 'codex';
  readonly displayName = 'OpenAI Codex';
  readonly aliases: readonly string[] = ['openai-codex'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.agents', 'skills')),
    agents: AgentHandler = new CodexTomlAgentHandler(),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler('AGENTS.md'),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
