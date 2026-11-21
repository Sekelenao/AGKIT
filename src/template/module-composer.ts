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

      const mod = modulesById.get(moduleId);
      if (mod === undefined) {
        const available = modules.map((item) => item.id).join(', ');
        throw new TemplateRepositoryError(
          `Unknown template module "${moduleId}". Available modules: ${available || 'none'}.`,
        );
      }

      visiting.add(moduleId);
      for (const parentId of mod.extends) {
        visit(parentId, [...trail, moduleId]);
      }
      visiting.delete(moduleId);
      visited.add(moduleId);
      resolved.push(mod);
    };

    for (const selectedId of selectedIds) {
      visit(selectedId, []);
    }

    return resolved;
  }

  compose(
    modules: readonly TemplateModule[],
    selectedIds: readonly string[],
  ): ComposedTemplates {
    const resolvedModules = this.resolveOrder(modules, selectedIds);
    const instructionParts: string[] = [];
    const skillsByName = new Map<string, TemplateSkill>();
    const agentsByName = new Map<string, TemplateAgent>();

    for (const mod of resolvedModules) {
      if (mod.rootInstructions !== undefined) {
        const trimmed = mod.rootInstructions.trim();
        if (trimmed.length > 0) {
          instructionParts.push(trimmed);
        }
      }

      for (const skill of mod.skills) {
        skillsByName.set(skill.name, skill);
      }

      for (const agent of mod.agents) {
        agentsByName.set(agent.name, agent);
      }
    }

    const rootInstructions =
      instructionParts.length > 0 ? `${instructionParts.join('\n\n')}\n` : undefined;

    return {
      resolvedModules,
      rootInstructions,
      skills: [...skillsByName.values()],
      agents: [...agentsByName.values()],
    };
  }
}
