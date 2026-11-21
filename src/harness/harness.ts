import type { SkillHandler } from './skill-handler.js';

export interface Harness {
  readonly name: string;
  readonly displayName: string;
  readonly aliases: readonly string[];
  readonly skills: SkillHandler;
}
