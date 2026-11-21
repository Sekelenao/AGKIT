export interface SkillFileEntry {
  readonly relativePath: string;
  readonly content: string;
}

export interface SkillHandler {
  relativePath(skillName: string, fileRelativePath?: string): string;
  write(
    targetDir: string,
    skillName: string,
    files: readonly SkillFileEntry[],
  ): Promise<readonly string[]>;
}
