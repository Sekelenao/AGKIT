import type { AgentCapability } from './agent-manifest.js';

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
  readonly capabilities: readonly AgentCapability[];
  readonly fileRegex?: string;
  readonly prompt: string;
}

export interface TemplateModule {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly extends: readonly string[];
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
