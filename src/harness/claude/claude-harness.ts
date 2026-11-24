import { join } from 'node:path';
import type { AgentHandler } from '../agent-handler.js';
import type { Harness } from '../harness.js';
import type { RootInstructionsHandler } from '../root-instructions-handler.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import { MarkdownAgentHandler } from '../shared/markdown-agent-handler.js';
import { SingleFileRootInstructionsHandler } from '../shared/single-file-root-instructions-handler.js';
import type { SkillHandler } from '../skill-handler.js';
import { ClaudeAgentFormatter } from './claude-agent-formatter.js';

export class ClaudeHarness implements Harness {
  readonly name = 'claude';
  readonly displayName = 'Claude Code';
  readonly aliases: readonly string[] = ['claude-code'];
  readonly skills: SkillHandler;
  readonly agents: AgentHandler;
  readonly rootInstructions: RootInstructionsHandler;

  constructor(
    skills: SkillHandler = new DirectorySkillHandler(join('.claude', 'skills')),
    agents: AgentHandler = new MarkdownAgentHandler(
      join('.claude', 'agents'),
      new ClaudeAgentFormatter(),
    ),
    rootInstructions: RootInstructionsHandler = new SingleFileRootInstructionsHandler('CLAUDE.md'),
  ) {
    this.skills = skills;
    this.agents = agents;
    this.rootInstructions = rootInstructions;
  }
}
