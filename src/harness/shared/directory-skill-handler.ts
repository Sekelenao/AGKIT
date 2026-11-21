import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SkillFileEntry, SkillHandler } from '../skill-handler.js';

export class DirectorySkillHandler implements SkillHandler {
  private readonly skillsRootDir: string;

  constructor(skillsRootDir: string) {
    this.skillsRootDir = skillsRootDir;
  }

  relativePath(skillName: string, fileRelativePath = 'SKILL.md'): string {
    const segments = fileRelativePath.split('/').filter((segment) => segment.length > 0);
    return join(this.skillsRootDir, skillName, ...segments);
  }

  async write(
    targetDir: string,
    skillName: string,
    files: readonly SkillFileEntry[],
  ): Promise<readonly string[]> {
    const writtenPaths: string[] = [];

    for (const file of files) {
      const relative = this.relativePath(skillName, file.relativePath);
      const absolute = join(targetDir, relative);

      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, 'utf8');
      writtenPaths.push(relative);
    }

    return writtenPaths;
  }
}
