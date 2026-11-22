import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Command } from 'commander';
import type { HarnessRegistry } from '../../harness/harness-registry.js';
import type { TemplateSkill } from '../../template/template-module.js';
import { TemplateRepositoryError } from '../../template/template-repository-error.js';
import { OutputFormatter } from '../../ui/output-formatter.js';
import type { CliCommand } from '../cli-command.js';

export interface NewOptions {
  readonly targetDir: string;
  readonly harnessName: string;
}

export interface NewResult {
  readonly harnessName: string;
  readonly writtenFiles: readonly string[];
}

interface NewCliOptions {
  readonly harness: string;
}

interface ScaffoldFile {
  readonly relativePath: string;
  readonly content: string;
}

const AUTHORING_SKILL: TemplateSkill = {
  name: 'agkit-template-authoring',
  description:
    'Authoring and validating modules, skills, and agents in an AGKIT template repository. Always run agkit spec first.',
  instructions: `# AGKIT Template Authoring

Before creating, modifying, or validating modules, skills, or agents in this repository, always run:

\`\`\`bash
agkit spec
\`\`\`

Treat the output of \`agkit spec\` as the single source of truth for:

- Directory layout under \`modules/\`
- JSON schemas (\`module.json\`, \`skill.json\`, \`agent.json\`)
- Composition rules and fail-fast collision invariants

## Core Rules

1. Keep \`ROOT.md\`, \`SKILL.md\`, and \`PROMPT.md\` as pure Markdown without manual YAML frontmatter — \`agkit\` generates harness-specific frontmatter automatically.
2. Use lowercase \`kebab-case\` names for all module, skill, and agent directories.
3. Give skills and agents distinct IDs across modules that users may combine together (duplicate IDs fail fast during composition).
`,
  companionFiles: [],
};

const STARTER_FILES: readonly ScaffoldFile[] = [
  {
    relativePath: 'README.md',
    content: `# AGKIT Template Repository

This repository contains composable, harness-agnostic AI templates under \`modules/\`.

## Authoring Guide

Run \`agkit spec\` to inspect the complete repository layout, JSON schemas, and validation rules.

## Usage

\`\`\`bash
agkit config --repo <this-repo-url>
agkit init -m example --harness opencode
\`\`\`
`,
  },
  {
    relativePath: join('modules', 'example', 'module.json'),
    content: `${JSON.stringify(
      {
        display_name: 'Example',
        description: 'Starter example module demonstrating ROOT.md, skills, and agents',
      },
      null,
      2,
    )}\n`,
  },
  {
    relativePath: join('modules', 'example', 'ROOT.md'),
    content: `# Example Module

Project-wide AI instructions contributed by the example module.
`,
  },
  {
    relativePath: join('modules', 'example', 'skills', 'example-skill', 'skill.json'),
    content: `${JSON.stringify(
      {
        description: 'Example skill showing how to structure reusable AI instructions',
      },
      null,
      2,
    )}\n`,
  },
  {
    relativePath: join('modules', 'example', 'skills', 'example-skill', 'SKILL.md'),
    content: `# Example Skill

Follow the guidelines in \`references/guide.md\` when working on example tasks.
`,
  },
  {
    relativePath: join('modules', 'example', 'skills', 'example-skill', 'references', 'guide.md'),
    content: `# Reference Guide

Add supporting documentation, checklists, or examples here.
`,
  },
  {
    relativePath: join('modules', 'example', 'agents', 'example-agent', 'agent.json'),
    content: `${JSON.stringify(
      {
        display_name: 'Example Reviewer',
        description: 'Reviews changes according to example conventions',
        when_to_use: 'Use when reviewing pull requests or checking example rules',
        capabilities: ['read', 'skill'],
      },
      null,
      2,
    )}\n`,
  },
  {
    relativePath: join('modules', 'example', 'agents', 'example-agent', 'PROMPT.md'),
    content: `# Example Reviewer

Review changes carefully and report clear, actionable findings.
`,
  },
];

export class NewCommand implements CliCommand {
  private readonly harnessRegistry: HarnessRegistry;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    harnessRegistry: HarnessRegistry,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.harnessRegistry = harnessRegistry;
    this.outputFormatter = outputFormatter;
  }

  register(program: Command): void {
    program
      .command('new')
      .description('Initialize a new AGKIT template repository in the current directory')
      .option(
        '--harness <name>',
        `AI harness used to author templates (${this.harnessRegistry.listNames().join(', ')})`,
        'opencode',
      )
      .action(async (options: NewCliOptions): Promise<void> => {
        const result = await this.execute({
          targetDir: process.cwd(),
          harnessName: options.harness,
        });

        for (const line of this.outputFormatter.formatNewSummary(result)) {
          console.log(line);
        }
      });
  }

  async execute(options: NewOptions): Promise<NewResult> {
    const harness = this.harnessRegistry.resolve(options.harnessName);

    const modulesDir = join(options.targetDir, 'modules');
    if (await this.pathExists(modulesDir)) {
      throw new TemplateRepositoryError(
        'Cannot initialize template repository: a "modules/" directory already exists here.',
      );
    }

    const writtenFiles: string[] = [];

    for (const file of STARTER_FILES) {
      const absolutePath = join(options.targetDir, file.relativePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file.content, 'utf8');
      writtenFiles.push(file.relativePath);
    }

    const writtenSkillFiles = await harness.skills.write(options.targetDir, AUTHORING_SKILL);
    for (const skillFile of writtenSkillFiles) {
      writtenFiles.push(skillFile.relativePath);
    }

    return {
      harnessName: harness.name,
      writtenFiles,
    };
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
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
