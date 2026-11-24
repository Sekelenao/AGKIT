import type { AgentCapability, AgentMode } from './agent-manifest.js';

export interface SkillFile {
  readonly relativePath: string;
  readonly content: string;
}

export interface TemplateSkill {
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly companionFiles: readonly SkillFile[];
}

export interface TemplateAgent {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly whenToUse?: string;
  readonly mode?: AgentMode;
  readonly capabilities: readonly AgentCapability[];
  readonly skills?: readonly string[];
  readonly fileRegex?: string;
  readonly prompt: string;
}

export interface TemplateModule {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly rootInstructions: string | undefined;
  readonly skills: readonly TemplateSkill[];
  readonly agents: readonly TemplateAgent[];
}

export interface ComposedTemplates {
  readonly resolvedModules: readonly TemplateModule[];
  readonly rootInstructions: string | undefined;
  readonly skills: readonly TemplateSkill[];
  readonly agents: readonly TemplateAgent[];
}
