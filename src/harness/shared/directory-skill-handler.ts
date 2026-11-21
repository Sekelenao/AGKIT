import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SkillHandler } from '../skill-handler.js';

export function createDirectorySkillHandler(skillsRootDir: string): SkillHandler {
  return {
    relativePath(skillName: string): string {
      return join(skillsRootDir, skillName, 'SKILL.md');
    },

    async write(targetDir: string, skillName: string, content: string): Promise<string> {
      const relative = join(skillsRootDir, skillName, 'SKILL.md');
      const absolute = join(targetDir, relative);

      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, content, 'utf8');

      return relative;
    },
  };
}
