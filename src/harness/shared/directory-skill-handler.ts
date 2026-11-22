import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { TemplateSkill } from '../../template/template-module.js';
import type { RenderedFile } from '../rendered-file.js';
import type { SkillHandler } from '../skill-handler.js';

export class DirectorySkillHandler implements SkillHandler {
  private readonly skillsRootDir: string;

  constructor(skillsRootDir: string) {
    this.skillsRootDir = skillsRootDir;
  }

  render(skill: TemplateSkill): readonly RenderedFile[] {
    const entryContent = this.formatSkillMarkdown(skill);
    const files: RenderedFile[] = [
      {
        relativePath: join(this.skillsRootDir, skill.name, 'SKILL.md'),
        content: entryContent,
      },
    ];

    for (const companion of skill.companionFiles) {
      const segments = companion.relativePath
        .split('/')
        .filter((segment) => segment.length > 0);
      files.push({
        relativePath: join(this.skillsRootDir, skill.name, ...segments),
        content: companion.content,
      });
    }

    return files;
  }

  async write(
    targetDir: string,
    skill: TemplateSkill,
  ): Promise<readonly RenderedFile[]> {
    const rendered = this.render(skill);

    for (const file of rendered) {
      const absolute = join(targetDir, file.relativePath);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, 'utf8');
    }

    return rendered;
  }

  private formatSkillMarkdown(skill: TemplateSkill): string {
    const body = skill.instructions.replace(/\r\n/g, '\n').trim();
    const frontmatter = [
      '---',
      `name: ${skill.name}`,
      `description: ${JSON.stringify(skill.description)}`,
      '---',
    ].join('\n');

    return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
  }
}
