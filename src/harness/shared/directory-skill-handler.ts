import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SkillHandler } from '../skill-handler.js';

export class DirectorySkillHandler implements SkillHandler {
  private readonly skillsRootDir: string;

  constructor(skillsRootDir: string) {
    this.skillsRootDir = skillsRootDir;
  }

  relativePath(skillName: string): string {
    return join(this.skillsRootDir, skillName, 'SKILL.md');
  }

  async write(targetDir: string, skillName: string, content: string): Promise<string> {
    const relative = this.relativePath(skillName);
    const absolute = join(targetDir, relative);

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');

    return relative;
  }
}
