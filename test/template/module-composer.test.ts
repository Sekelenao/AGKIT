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
      rootInstructions: '# Base\n\nCommon rules.\n',
      skills: [
        {
          name: 'testing',
          description: 'Base testing',
          instructions: '# Base Testing',
          companionFiles: [{ relativePath: 'references/legacy.md', content: 'old ref' }],
        },
        {
          name: 'git',
          description: 'Git rules',
          instructions: '# Git',
          companionFiles: [],
        },
      ],
      agents: [
        {
          name: 'reviewer',
          displayName: 'Base Reviewer',
          description: 'Reviews code',
          capabilities: ['read'],
          prompt: '# Base Reviewer',
        },
      ],
    },
    {
      id: 'java-base',
      displayName: 'Java Base',
      description: 'Java conventions',
      rootInstructions: '## Java\n\nUse Java 21.\n',
      skills: [],
      agents: [],
    },
    {
      id: 'flink',
      displayName: 'Flink',
      description: 'Flink rules',
      rootInstructions: '## Flink\n\nAvoid blocking calls.\n',
      skills: [
        {
          name: 'flink-testing',
          description: 'Flink testing',
          instructions: '# Flink Testing',
          companionFiles: [],
        },
      ],
      agents: [
        {
          name: 'flink-reviewer',
          displayName: 'Flink Reviewer',
          description: 'Reviews Flink jobs',
          capabilities: ['read', 'skill'],
          prompt: '# Flink Reviewer',
        },
      ],
    },
    {
      id: 'front',
      displayName: 'Frontend',
      description: 'Frontend rules',
      rootInstructions: undefined,
      skills: [
        {
          name: 'react',
          description: 'React rules',
          instructions: '# React',
          companionFiles: [],
        },
      ],
      agents: [
        {
          name: 'ui-auditor',
          displayName: 'UI Auditor',
          description: 'Audits UI',
          capabilities: ['read'],
          prompt: '# UI Auditor',
        },
      ],
    },
  ];

  it('resolves selected modules in selection order and deduplicates repeated IDs', () => {
    const order = composer.resolveOrder(modules, ['base', 'java-base', 'flink', 'base', 'front']);

    expect(order.map((mod) => mod.id)).toEqual(['base', 'java-base', 'flink', 'front']);
  });

  it('concatenates ROOT.md in selection order and combines distinct skills and agents', () => {
    const composed = composer.compose(modules, ['base', 'java-base', 'flink', 'front']);

    expect(composed.rootInstructions).toBe(
      '# Base\n\nCommon rules.\n\n## Java\n\nUse Java 21.\n\n## Flink\n\nAvoid blocking calls.\n',
    );
    expect(composed.skills).toEqual([
      {
        name: 'testing',
        description: 'Base testing',
        instructions: '# Base Testing',
        companionFiles: [{ relativePath: 'references/legacy.md', content: 'old ref' }],
      },
      {
        name: 'git',
        description: 'Git rules',
        instructions: '# Git',
        companionFiles: [],
      },
      {
        name: 'flink-testing',
        description: 'Flink testing',
        instructions: '# Flink Testing',
        companionFiles: [],
      },
      {
        name: 'react',
        description: 'React rules',
        instructions: '# React',
        companionFiles: [],
      },
    ]);
    expect(composed.agents).toEqual([
      {
        name: 'reviewer',
        displayName: 'Base Reviewer',
        description: 'Reviews code',
        capabilities: ['read'],
        prompt: '# Base Reviewer',
      },
      {
        name: 'flink-reviewer',
        displayName: 'Flink Reviewer',
        description: 'Reviews Flink jobs',
        capabilities: ['read', 'skill'],
        prompt: '# Flink Reviewer',
      },
      {
        name: 'ui-auditor',
        displayName: 'UI Auditor',
        description: 'Audits UI',
        capabilities: ['read'],
        prompt: '# UI Auditor',
      },
    ]);
  });

  it('deduplicates repeated module IDs without reporting self-collisions', () => {
    const composed = composer.compose(modules, ['base', 'base']);

    expect(composed.resolvedModules.map((mod) => mod.id)).toEqual(['base']);
    expect(composed.skills.map((skill) => skill.name)).toEqual(['testing', 'git']);
  });

  it('throws TemplateRepositoryError when multiple selected modules define the same skill ID', () => {
    const collidingModules: readonly TemplateModule[] = [
      ...modules,
      {
        id: 'dup-skill',
        displayName: 'Dup Skill',
        description: 'Colliding skill',
        rootInstructions: undefined,
        skills: [
          {
            name: 'testing',
            description: 'Duplicate testing',
            instructions: '# Dup',
            companionFiles: [],
          },
        ],
        agents: [],
      },
    ];

    expect(() => composer.compose(collidingModules, ['base', 'dup-skill'])).toThrow(
      TemplateRepositoryError,
    );
    expect(() => composer.compose(collidingModules, ['base', 'dup-skill'])).toThrow(
      'Skill "testing" is defined in multiple selected modules: base, dup-skill',
    );
  });

  it('throws TemplateRepositoryError when multiple selected modules define the same agent ID', () => {
    const collidingModules: readonly TemplateModule[] = [
      ...modules,
      {
        id: 'dup-agent',
        displayName: 'Dup Agent',
        description: 'Colliding agent',
        rootInstructions: undefined,
        skills: [],
        agents: [
          {
            name: 'reviewer',
            displayName: 'Duplicate Reviewer',
            description: 'Duplicate reviewer',
            capabilities: ['read'],
            prompt: '# Dup',
          },
        ],
      },
    ];

    expect(() => composer.compose(collidingModules, ['base', 'dup-agent'])).toThrow(
      TemplateRepositoryError,
    );
    expect(() => composer.compose(collidingModules, ['base', 'dup-agent'])).toThrow(
      'Agent "reviewer" is defined in multiple selected modules: base, dup-agent',
    );
  });

  it('throws TemplateRepositoryError when selecting an unknown module ID', () => {
    expect(() => composer.resolveOrder(modules, ['unknown'])).toThrow(TemplateRepositoryError);
  });
});
