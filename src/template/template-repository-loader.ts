import type { Dirent } from 'node:fs';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import type { z } from 'zod';
import {
  AGENT_ID_PATTERN,
  type AgentManifest,
  agentManifestSchema,
} from './agent-manifest.js';
import {
  MODULE_ID_PATTERN,
  type ModuleManifest,
  moduleManifestSchema,
} from './module-manifest.js';
import {
  SKILL_ID_PATTERN,
  type SkillManifest,
  skillManifestSchema,
} from './skill-manifest.js';
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
const SKILL_MANIFEST_FILE_NAME = 'skill.json';
const SKILL_ENTRY_FILE_NAME = 'SKILL.md';
const AGENTS_DIR_NAME = 'agents';
const AGENT_MANIFEST_FILE_NAME = 'agent.json';
const AGENT_PROMPT_FILE_NAME = 'PROMPT.md';

export class TemplateRepositoryLoader {
  async loadAll(repoDir: string): Promise<readonly TemplateModule[]> {
    const modulesRoot = join(repoDir, MODULES_DIR_NAME);
    const entries = await this.readRequiredDirectory(
      modulesRoot,
      `Template repository is missing required "${MODULES_DIR_NAME}/" directory at ${repoDir}.`,
    );
    this.rejectSymlinks(entries, MODULES_DIR_NAME);

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

    return modules;
  }

  private async loadModule(moduleDir: string, moduleId: string): Promise<TemplateModule> {
    const manifest = await this.loadJsonManifest<ModuleManifest>(
      join(moduleDir, MANIFEST_FILE_NAME),
      moduleManifestSchema,
      `Module "${moduleId}" is missing required ${MANIFEST_FILE_NAME}.`,
      `Invalid ${MANIFEST_FILE_NAME} in module "${moduleId}"`,
    );
    const rootInstructions = await this.readOptionalTextFile(
      join(moduleDir, ROOT_INSTRUCTIONS_FILE_NAME),
    );
    const skills = await this.loadSkills(join(moduleDir, SKILLS_DIR_NAME), moduleId);
    const agents = await this.loadAgents(join(moduleDir, AGENTS_DIR_NAME), moduleId);

    return {
      id: moduleId,
      displayName: manifest.display_name,
      description: manifest.description,
      rootInstructions,
      skills,
      agents,
    };
  }

  private async loadSkills(
    skillsDir: string,
    moduleId: string,
  ): Promise<readonly TemplateSkill[]> {
    const entries = await this.readOptionalDirectory(skillsDir);
    if (entries === undefined) {
      return [];
    }
    this.rejectSymlinks(entries, `${moduleId}/${SKILLS_DIR_NAME}`);

    const skillDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const skills: TemplateSkill[] = [];
    for (const skillName of skillDirs) {
      if (!SKILL_ID_PATTERN.test(skillName)) {
        throw new TemplateRepositoryError(
          `Invalid skill directory name "${skillName}" in module "${moduleId}". Skill IDs must be lowercase kebab-case.`,
        );
      }

      const skillDir = join(skillsDir, skillName);
      const manifest = await this.loadJsonManifest<SkillManifest>(
        join(skillDir, SKILL_MANIFEST_FILE_NAME),
        skillManifestSchema,
        `Skill "${skillName}" in module "${moduleId}" is missing required ${SKILL_MANIFEST_FILE_NAME}.`,
        `Invalid ${SKILL_MANIFEST_FILE_NAME} in skill "${skillName}" (module "${moduleId}")`,
      );
      const instructions = await this.readOptionalTextFile(
        join(skillDir, SKILL_ENTRY_FILE_NAME),
      );
      if (instructions === undefined) {
        throw new TemplateRepositoryError(
          `Skill "${skillName}" in module "${moduleId}" is missing required ${SKILL_ENTRY_FILE_NAME}.`,
        );
      }

      const allFiles = await this.collectFilesRecursively(skillDir, '');
      const companionFiles = allFiles.filter(
        (file) =>
          file.relativePath !== SKILL_MANIFEST_FILE_NAME &&
          file.relativePath !== SKILL_ENTRY_FILE_NAME,
      );

      skills.push({
        name: skillName,
        description: manifest.description,
        instructions,
        companionFiles,
      });
    }

    return skills;
  }

  private async loadAgents(
    agentsDir: string,
    moduleId: string,
  ): Promise<readonly TemplateAgent[]> {
    const entries = await this.readOptionalDirectory(agentsDir);
    if (entries === undefined) {
      return [];
    }
    this.rejectSymlinks(entries, `${moduleId}/${AGENTS_DIR_NAME}`);

    const agentDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const agents: TemplateAgent[] = [];
    for (const agentName of agentDirs) {
      if (!AGENT_ID_PATTERN.test(agentName)) {
        throw new TemplateRepositoryError(
          `Invalid agent directory name "${agentName}" in module "${moduleId}". Agent IDs must be lowercase kebab-case.`,
        );
      }

      const agentDir = join(agentsDir, agentName);
      const manifest = await this.loadJsonManifest<AgentManifest>(
        join(agentDir, AGENT_MANIFEST_FILE_NAME),
        agentManifestSchema,
        `Agent "${agentName}" in module "${moduleId}" is missing required ${AGENT_MANIFEST_FILE_NAME}.`,
        `Invalid ${AGENT_MANIFEST_FILE_NAME} in agent "${agentName}" (module "${moduleId}")`,
      );
      const prompt = await this.readOptionalTextFile(
        join(agentDir, AGENT_PROMPT_FILE_NAME),
      );
      if (prompt === undefined) {
        throw new TemplateRepositoryError(
          `Agent "${agentName}" in module "${moduleId}" is missing required ${AGENT_PROMPT_FILE_NAME}.`,
        );
      }

      agents.push({
        name: agentName,
        displayName: manifest.display_name,
        description: manifest.description,
        ...(manifest.when_to_use === undefined
          ? {}
          : { whenToUse: manifest.when_to_use }),
        ...(manifest.mode === undefined ? {} : { mode: manifest.mode }),
        capabilities: manifest.capabilities,
        ...(manifest.skills === undefined ? {} : { skills: manifest.skills }),
        ...(manifest.file_regex === undefined ? {} : { fileRegex: manifest.file_regex }),
        prompt,
      });
    }

    return agents;
  }

  private async loadJsonManifest<T>(
    filePath: string,
    schema: z.ZodType<T>,
    missingMessage: string,
    invalidPrefix: string,
  ): Promise<T> {
    const raw = await this.readOptionalTextFile(filePath);
    if (raw === undefined) {
      throw new TemplateRepositoryError(missingMessage);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error: unknown) {
      throw new TemplateRepositoryError(`Invalid JSON in ${filePath}.`, {
        cause: error,
      });
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`)
        .join('; ');
      throw new TemplateRepositoryError(`${invalidPrefix}: ${details}`);
    }

    return result.data;
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

      if (entry.isSymbolicLink()) {
        throw new TemplateRepositoryError(
          `Symbolic links are not allowed in template repositories: "${entryRelative}".`,
        );
      }

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

  private rejectSymlinks(entries: readonly Dirent[], scope: string): void {
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        throw new TemplateRepositoryError(
          `Symbolic links are not allowed in template repositories: "${scope}/${entry.name}".`,
        );
      }
    }
  }

  private async readOptionalTextFile(filePath: string): Promise<string | undefined> {
    try {
      const stats = await lstat(filePath);
      if (stats.isSymbolicLink()) {
        throw new TemplateRepositoryError(
          `Symbolic links are not allowed in template repositories: "${filePath}".`,
        );
      }
      if (!stats.isFile()) {
        throw new TemplateRepositoryError(
          `Expected a regular file in template repository: "${filePath}".`,
        );
      }
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
