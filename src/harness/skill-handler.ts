export interface SkillHandler {
  relativePath(skillName: string): string;
  write(targetDir: string, skillName: string, content: string): Promise<string>;
}
