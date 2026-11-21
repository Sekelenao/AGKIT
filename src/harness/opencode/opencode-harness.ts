import { join } from 'node:path';
import type { Harness } from '../harness.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import type { SkillHandler } from '../skill-handler.js';

export class OpencodeHarness implements Harness {
  readonly name = 'opencode';
  readonly skills: SkillHandler;

  constructor(skills: SkillHandler = new DirectorySkillHandler(join('.opencode', 'skills'))) {
    this.skills = skills;
  }
}
