import { join } from 'node:path';
import type { Harness } from '../harness.js';
import { createDirectorySkillHandler } from '../shared/directory-skill-handler.js';

export const opencodeHarness: Harness = {
  name: 'opencode',
  skills: createDirectorySkillHandler(join('.opencode', 'skills')),
};
