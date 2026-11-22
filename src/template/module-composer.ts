import type {
  ComposedTemplates,
  TemplateAgent,
  TemplateModule,
  TemplateSkill,
} from './template-module.js';
import { TemplateRepositoryError } from './template-repository-error.js';

export class ModuleComposer {
  resolveOrder(
    modules: readonly TemplateModule[],
    selectedIds: readonly string[],
  ): readonly TemplateModule[] {
    const modulesById = new Map<string, TemplateModule>();
    for (const mod of modules) {
      modulesById.set(mod.id, mod);
    }

    const resolved: TemplateModule[] = [];
    const seen = new Set<string>();

    for (const selectedId of selectedIds) {
      if (seen.has(selectedId)) {
        continue;
      }

      const mod = modulesById.get(selectedId);
      if (mod === undefined) {
        const available = modules.map((item) => item.id).join(', ');
        throw new TemplateRepositoryError(
          `Unknown template module "${selectedId}". Available modules: ${available || 'none'}.`,
        );
      }

      seen.add(selectedId);
      resolved.push(mod);
    }

    return resolved;
  }

  compose(
    modules: readonly TemplateModule[],
    selectedIds: readonly string[],
  ): ComposedTemplates {
    const resolvedModules = this.resolveOrder(modules, selectedIds);
    const instructionParts: string[] = [];
    const skills: TemplateSkill[] = [];
    const agents: TemplateAgent[] = [];
    const skillSources = new Map<string, string[]>();
    const agentSources = new Map<string, string[]>();

    for (const mod of resolvedModules) {
      if (mod.rootInstructions !== undefined) {
        const trimmed = mod.rootInstructions.trim();
        if (trimmed.length > 0) {
          instructionParts.push(trimmed);
        }
      }

      for (const skill of mod.skills) {
        const owners = skillSources.get(skill.name) ?? [];
        owners.push(mod.id);
        skillSources.set(skill.name, owners);
        skills.push(skill);
      }

      for (const agent of mod.agents) {
        const owners = agentSources.get(agent.name) ?? [];
        owners.push(mod.id);
        agentSources.set(agent.name, owners);
        agents.push(agent);
      }
    }

    const conflicts: string[] = [];
    for (const [skillName, owners] of skillSources) {
      if (owners.length > 1) {
        conflicts.push(
          `Skill "${skillName}" is defined in multiple selected modules: ${owners.join(', ')}`,
        );
      }
    }
    for (const [agentName, owners] of agentSources) {
      if (owners.length > 1) {
        conflicts.push(
          `Agent "${agentName}" is defined in multiple selected modules: ${owners.join(', ')}`,
        );
      }
    }

    if (conflicts.length > 0) {
      throw new TemplateRepositoryError(`Template composition conflict: ${conflicts.join('; ')}.`);
    }

    const rootInstructions =
      instructionParts.length > 0 ? `${instructionParts.join('\n\n')}\n` : undefined;

    return {
      resolvedModules,
      rootInstructions,
      skills,
      agents,
    };
  }
}
