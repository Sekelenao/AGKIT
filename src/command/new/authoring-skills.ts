import type { TemplateSkill } from '../../template/template-module.js';

export const AUTHORING_SKILLS: readonly TemplateSkill[] = [
  {
    name: 'agkit-template-authoring',
    description:
      'Authoring and validating modules in an AGKIT template repository. Use when creating, structuring, or validating modules under modules/.',
    instructions: `# AGKIT Template Authoring

Before creating, modifying, or validating modules, skills, or agents in this repository, always run \`agkit spec\` and treat its output as the single source of truth for directory layout, JSON schemas, and validation invariants.

## Core Rules

- Place every module under \`modules/<module-id>/\` with a valid \`module.json\` (\`display_name\`, \`description\`).
- Use lowercase \`kebab-case\` names for all module, skill, and agent directories.
- Keep modules independent and composable: there is no implicit \`base\` module and no module inheritance.
- Keep \`ROOT.md\`, \`SKILL.md\`, and \`PROMPT.md\` as pure Markdown without manual YAML frontmatter; \`agkit\` generates harness-specific frontmatter automatically.
- Give skills and agents unique IDs across modules that users may combine together (duplicate IDs fail fast during composition).

## Specialized Guides

- Use \`agkit-root-authoring\` when writing \`ROOT.md\`.
- Use \`agkit-skill-authoring\` when writing \`skills/<skill-id>/\`.
- Use \`agkit-agent-authoring\` when writing \`agents/<agent-id>/\`.
`,
    companionFiles: [],
  },
  {
    name: 'agkit-root-authoring',
    description:
      'Authoring ROOT.md project-wide instructions inside AGKIT template modules. Use when creating or updating a module ROOT.md file.',
    instructions: `# AGKIT Root Instructions Authoring

Run \`agkit spec\` first to verify repository layout and composition rules.

## Rules

- Design for concatenation: \`agkit\` concatenates \`ROOT.md\` from all selected modules in selection order. Use self-contained \`##\` sections and do not assume this module is the only or first \`ROOT.md\` in the output.
- Stay harness-agnostic: \`agkit\` renders \`ROOT.md\` to \`AGENTS.md\` or \`CLAUDE.md\` depending on the target harness. Do not hardcode harness-specific filenames (\`AGENTS.md\`, \`CLAUDE.md\`) or tool directories (\`.claude/\`, \`.opencode/\`, \`.agents/\`, \`.bob/\`).
- Pure Markdown only: do not add manual YAML frontmatter to \`ROOT.md\`.
- Keep instructions high-signal and concise: include only always-relevant project invariants and pointers in \`ROOT.md\`. Move detailed workflows, checklists, and domain standards into dedicated skills under \`skills/<skill-id>/\`.
- Avoid cross-module contradictions: scope rules clearly to the module domain so combining multiple modules does not produce conflicting guidance.
`,
    companionFiles: [],
  },
  {
    name: 'agkit-skill-authoring',
    description:
      'Authoring reusable skills (skill.json and SKILL.md) inside AGKIT template modules. Use when creating, updating, or reviewing a skill under modules/<module>/skills/.',
    instructions: `# AGKIT Skill Authoring

Run \`agkit spec\` first to verify the \`skill.json\` schema and directory conventions.

## Rules

- Directory and naming: place each skill in \`modules/<module-id>/skills/<skill-id>/\` with lowercase \`kebab-case\` \`<skill-id>\`, \`skill.json\`, and \`SKILL.md\`. Ensure \`<skill-id>\` does not collide with skills in other modules users may combine.
- Trigger-oriented \`skill.json\`: write a concise \`description\` stating both what the skill covers and when the AI should activate it. Keep it portable across all supported harnesses.
- Pure Markdown in \`SKILL.md\`: do not add manual YAML frontmatter; \`agkit\` generates harness-native frontmatter automatically.
- Stay harness-agnostic: do not hardcode harness-specific skill paths (\`.claude/skills/\`, \`.opencode/skills/\`, \`.agents/skills/\`, \`.bob/skills/\`) inside \`SKILL.md\`. Reference companion files with relative paths such as \`references/guide.md\` or \`scripts/check.sh\`.
- Progressive disclosure: keep \`SKILL.md\` focused on direct, imperative rules. Place long examples, reference docs, or helper scripts in companion subdirectories (\`references/\`, \`examples/\`, \`scripts/\`), which \`agkit\` copies as-is.
`,
    companionFiles: [],
  },
  {
    name: 'agkit-agent-authoring',
    description:
      'Authoring specialized agents (agent.json and PROMPT.md) inside AGKIT template modules. Use when creating, updating, or reviewing an agent under modules/<module>/agents/.',
    instructions: `# AGKIT Agent Authoring

Run \`agkit spec\` first to verify the \`agent.json\` schema and allowed \`capabilities\` values.

## Rules

- Directory and naming: place each agent in \`modules/<module-id>/agents/<agent-id>/\` with lowercase \`kebab-case\` \`<agent-id>\`, \`agent.json\`, and \`PROMPT.md\`. Ensure \`<agent-id>\` does not collide with agents in other modules users may combine.
- Metadata in \`agent.json\`: set a clear \`display_name\`, a concise \`description\`, and an action-oriented \`when_to_use\` stating when the harness should invoke or suggest the agent.
- Least-privilege \`capabilities\`: explicitly list only the capabilities the agent needs from \`read\`, \`edit\`, \`execute\`, \`skill\`, and \`subagent\` (for example, \`["read", "skill"]\` for a read-only reviewer). Omitting \`capabilities\` grants all capabilities.
- Optional \`mode\` and \`skills\`: set \`mode\` (\`"subagent"\`, \`"primary"\`, or \`"all"\`) when controlling primary vs subagent availability, and list lowercase \`kebab-case\` skill IDs under \`skills\` when declaring explicit skill dependencies for harnesses that support them.
- Optional \`file_regex\`: set \`file_regex\` only when the agent must be restricted to specific file paths (used by harnesses that support file scoping such as IBM Bob).
- Pure Markdown in \`PROMPT.md\`: do not add manual YAML frontmatter; \`agkit\` translates \`agent.json\` and \`PROMPT.md\` into each harness's native format.
- Role over duplicated rules: define the agent's mission, workflow, and output format in \`PROMPT.md\`, and delegate detailed coding or domain standards to skills rather than duplicating them.
`,
    companionFiles: [],
  },
];
