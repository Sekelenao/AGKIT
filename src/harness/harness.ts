import type { AgentHandler } from './agent-handler.js';
import type { RootInstructionsHandler } from './root-instructions-handler.js';
import type { SkillHandler } from './skill-handler.js';

export interface Harness {
  readonly name: string;
  readonly displayName: string;
  readonly aliases: readonly string[];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;
}
