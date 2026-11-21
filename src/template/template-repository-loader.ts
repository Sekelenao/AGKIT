import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { MODULE_ID_PATTERN, type ModuleManifest, moduleManifestSchema } from './module-manifest.js';
import type {
  SkillFile,
  TemplateAgent,
  TemplateModule,
  TemplateSkill,
} from './template-module.js';
import { TemplateRepositoryError } from './template-repository-error.js';

const MODULES_DIR_NAME = 'modules';
const MANIFEST_FILE_NAME = 'module.json';
const ROOT_INSTRUCTIONS_FILE_NAME = 'ROOT.md';
const SKILLS_DIR_NAME = 'skills';
const SKILL_ENTRY_FILE_NAME = 'SKILL.md';
const AGENTS_DIR_NAME = 'agents';

export class TemplateRepositoryLoader {
  async loadAll(repoDir: string): Promise<readonly TemplateModule[]> {
    const modulesRoot = join(repoDir, MODULES_DIR_NAME);
    const entries = await this.readRequiredDirectory(
      modulesRoot,
      `Template repository is missing required "${MODULES_DIR_NAME}/" directory at ${repoDir}.`,
    );

    const moduleDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const modules: TemplateModule[] = [];
    for (const moduleId of moduleDirs) {
      if (!MODULE_ID_PATTERN.test(moduleId)) {
        throw new TemplateRepositoryError(
          `Invalid module directory name "${moduleId}". Module IDs must be lowercase kebab-case.`,
        );
      }
      modules.push(await this.loadModule(join(modulesRoot, moduleId), moduleId));
    }

    this.validateGraph(modules);
    return modules;
  }

  private async loadModule(moduleDir: string, moduleId: string): Promise<TemplateModule> {
    const manifest = await this.loadManifest(moduleDir, moduleId);
    const rootInstructions = await this.readOptionalTextFile(
      join(moduleDir, ROOT_INSTRUCTIONS_FILE_NAME),
    );
    const skills = await this.loadSkills(join(moduleDir, SKILLS_DIR_NAME), moduleId);
    const agents = await this.loadAgents(join(moduleDir, AGENTS_DIR_NAME));

    return {
      id: moduleId,
      displayName: manifest.display_name,
      description: manifest.description,
      extends: manifest.extends,
      rootInstructions,
      skills,
      agents,
    };
  }

  private async loadManifest(moduleDir: string, moduleId: string): Promise<ModuleManifest> {
    const manifestPath = join(moduleDir, MANIFEST_FILE_NAME);
    const raw = await this.readOptionalTextFile(manifestPath);
    if (raw === undefined) {
      throw new TemplateRepositoryError(
        `Module "${moduleId}" is missing required ${MANIFEST_FILE_NAME}.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error: unknown) {
      throw new TemplateRepositoryError(
        `Invalid JSON in ${manifestPath}.`,
        { cause: error },
      );
    }

    const result = moduleManifestSchema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`)
        .join('; ');
      throw new TemplateRepositoryError(
        `Invalid ${MANIFEST_FILE_NAME} in module "${moduleId}": ${details}`,
      );
    }

    return result.data;
  }

  private async loadSkills(
    skillsDir: string,
    moduleId: string,
  ): Promise<readonly TemplateSkill[]> {
    const entries = await this.readOptionalDirectory(skillsDir);
    if (entries === undefined) {
      return [];
    }

    const skillDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const skills: TemplateSkill[] = [];
    for (const skillName of skillDirs) {
      const skillDir = join(skillsDir, skillName);
      const files = await this.collectFilesRecursively(skillDir, '');
      const hasEntryFile = files.some((file) => file.relativePath === SKILL_ENTRY_FILE_NAME);

      if (!hasEntryFile) {
        throw new TemplateRepositoryError(
          `Skill "${skillName}" in module "${moduleId}" is missing required ${SKILL_ENTRY_FILE_NAME}.`,
        );
      }

      skills.push({
        name: skillName,
        files,
      });
    }

    return skills;
  }

  private async collectFilesRecursively(
    directory: string,
    relativePrefix: string,
  ): Promise<readonly SkillFile[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    const files: SkillFile[] = [];

    for (const entry of sorted) {
      const entryRelative =
        relativePrefix === '' ? entry.name : posix.join(relativePrefix, entry.name);
      const entryAbsolute = join(directory, entry.name);

      if (entry.isDirectory()) {
        const nested = await this.collectFilesRecursively(entryAbsolute, entryRelative);
        files.push(...nested);
      } else if (entry.isFile()) {
        const content = await readFile(entryAbsolute, 'utf8');
        files.push({
          relativePath: entryRelative,
          content,
        });
      }
    }

    return files;
  }

  private async loadAgents(agentsDir: string): Promise<readonly TemplateAgent[]> {
    const entries = await this.readOptionalDirectory(agentsDir);
    if (entries === undefined) {
      return [];
    }

    const sorted = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name));
    const agents: TemplateAgent[] = [];

    for (const entry of sorted) {
      const name = entry.name.slice(0, -'.md'.length);
      const content = await readFile(join(agentsDir, entry.name), 'utf8');
      agents.push({ name, content });
    }

    return agents;
  }

  private validateGraph(modules: readonly TemplateModule[]): void {
    const modulesById = new Map<string, TemplateModule>();
    for (const mod of modules) {
      modulesById.set(mod.id, mod);
    }

    for (const mod of modules) {
      for (const parentId of mod.extends) {
        if (!modulesById.has(parentId)) {
          throw new TemplateRepositoryError(
            `Module "${mod.id}" extends unknown module "${parentId}".`,
          );
        }
      }
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string, trail: readonly string[]): void => {
      if (visited.has(moduleId)) {
        return;
      }
      if (visiting.has(moduleId)) {
        const cycle = [...trail, moduleId].join(' -> ');
        throw new TemplateRepositoryError(`Circular module dependency detected: ${cycle}.`);
      }

      visiting.add(moduleId);
      const mod = modulesById.get(moduleId);
      if (mod !== undefined) {
        for (const parentId of mod.extends) {
          visit(parentId, [...trail, moduleId]);
        }
      }
      visiting.delete(moduleId);
      visited.add(moduleId);
    };

    for (const mod of modules) {
      visit(mod.id, []);
    }
  }

  private async readRequiredDirectory(
    dirPath: string,
    missingMessage: string,
  ): Promise<readonly Dirent[]> {
    const entries = await this.readOptionalDirectory(dirPath);
    if (entries === undefined) {
      throw new TemplateRepositoryError(missingMessage);
    }
    return entries;
  }

  private async readOptionalDirectory(dirPath: string): Promise<readonly Dirent[] | undefined> {
    try {
      return await readdir(dirPath, { withFileTypes: true });
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async readOptionalTextFile(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf8');
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
