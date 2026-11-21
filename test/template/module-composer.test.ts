import { describe, expect, it } from 'vitest';
import { ModuleComposer } from '../../src/template/module-composer.js';
import type { TemplateModule } from '../../src/template/template-module.js';
import { TemplateRepositoryError } from '../../src/template/template-repository-error.js';

describe('ModuleComposer', () => {
  const composer = new ModuleComposer();

  const modules: readonly TemplateModule[] = [
    {
      id: 'base',
      displayName: 'Base',
      description: 'Shared baseline',
      extends: [],
      rootInstructions: '# Base\n\nCommon rules.\n',
      skills: [
        {
          name: 'testing',
          files: [
            { relativePath: 'SKILL.md', content: '# Base Testing' },
            { relativePath: 'references/legacy.md', content: 'old ref' },
          ],
        },
        {
          name: 'git',
          files: [{ relativePath: 'SKILL.md', content: '# Git' }],
        },
      ],
      agents: [{ name: 'reviewer', content: '# Base Reviewer' }],
    },
    {
      id: 'java-base',
      displayName: 'Java Base',
      description: 'Java conventions',
      extends: ['base'],
      rootInstructions: '## Java\n\nUse Java 21.\n',
      skills: [],
      agents: [],
    },
    {
      id: 'flink',
      displayName: 'Flink',
      description: 'Flink rules',
      extends: ['java-base'],
      rootInstructions: '## Flink\n\nAvoid blocking calls.\n',
      skills: [
        {
          name: 'testing',
          files: [{ relativePath: 'SKILL.md', content: '# Flink Testing' }],
        },
      ],
      agents: [{ name: 'reviewer', content: '# Flink Reviewer' }],
    },
    {
      id: 'front',
      displayName: 'Frontend',
      description: 'Frontend rules',
      extends: ['base'],
      rootInstructions: undefined,
      skills: [
        {
          name: 'react',
          files: [{ relativePath: 'SKILL.md', content: '# React' }],
        },
      ],
      agents: [{ name: 'ui-auditor', content: '# UI Auditor' }],
    },
  ];

  it('resolves diamond dependencies deterministically and deduplicates shared ancestors', () => {
    const order = composer.resolveOrder(modules, ['flink', 'front']);

    expect(order.map((mod) => mod.id)).toEqual(['base', 'java-base', 'flink', 'front']);
  });

  it('concatenates ROOT.md in layer order and overrides skills (whole directory) and agents by name', () => {
    const composed = composer.compose(modules, ['flink', 'front']);

    expect(composed.rootInstructions).toBe(
      '# Base\n\nCommon rules.\n\n## Java\n\nUse Java 21.\n\n## Flink\n\nAvoid blocking calls.\n',
    );
    expect(composed.skills).toEqual([
      {
        name: 'testing',
        files: [{ relativePath: 'SKILL.md', content: '# Flink Testing' }],
      },
      {
        name: 'git',
        files: [{ relativePath: 'SKILL.md', content: '# Git' }],
      },
      {
        name: 'react',
        files: [{ relativePath: 'SKILL.md', content: '# React' }],
      },
    ]);
    expect(composed.agents).toEqual([
      { name: 'reviewer', content: '# Flink Reviewer' },
      { name: 'ui-auditor', content: '# UI Auditor' },
    ]);
  });

  it('throws TemplateRepositoryError when selecting an unknown module ID', () => {
    expect(() => composer.resolveOrder(modules, ['unknown'])).toThrow(TemplateRepositoryError);
  });
});
