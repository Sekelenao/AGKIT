import { join } from 'node:path';
import type { Harness } from '../harness.js';
import { createDirectorySkillHandler } from '../shared/directory-skill-handler.js';

export const agyHarness: Harness = {
  name: 'agy',
  skills: createDirectorySkillHandler(join('.agents', 'skills')),
};
