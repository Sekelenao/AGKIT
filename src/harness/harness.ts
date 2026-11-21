import type { SkillHandler } from './skill-handler.js';

export interface Harness {
  readonly name: string;
  readonly skills: SkillHandler;
}
