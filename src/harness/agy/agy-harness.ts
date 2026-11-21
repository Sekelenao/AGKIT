import { join } from 'node:path';
import type { Harness } from '../harness.js';
import { DirectorySkillHandler } from '../shared/directory-skill-handler.js';
import type { SkillHandler } from '../skill-handler.js';

export class AgyHarness implements Harness {
  readonly name = 'agy';
  readonly skills: SkillHandler;

  constructor(skills: SkillHandler = new DirectorySkillHandler(join('.agents', 'skills'))) {
    this.skills = skills;
  }
}
