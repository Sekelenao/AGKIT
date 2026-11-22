import type { TemplateSkill } from '../template/template-module.js';
import type { RenderedFile } from './rendered-file.js';

export interface SkillHandler {
  render(skill: TemplateSkill): readonly RenderedFile[];
  write(targetDir: string, skill: TemplateSkill): Promise<readonly RenderedFile[]>;
}
