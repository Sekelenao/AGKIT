# Template Repository Specification

This document defines the structure, metadata schemas, resolution rules, and validation invariants of a central Git template repository consumed by `agkit`.

## 1. Repository Layout

All composable modules live inside a dedicated `modules/` directory at the root of the template repository. Every structured artifact uses a consistent `JSON + Markdown` split (`module.json` + `ROOT.md`, `skill.json` + `SKILL.md`, `agent.json` + `PROMPT.md`) so metadata is strictly validated with Zod while instructions remain pure Markdown without manual frontmatter.

```text
templates-repo/
├── README.md
└── modules/
    ├── base/
    │   ├── module.json
    │   ├── ROOT.md
    │   ├── skills/
    │   │   └── git-conventions/
    │   │       ├── skill.json
    │   │       ├── SKILL.md
    │   │       └── references/
    │   │           └── commit-examples.md
    │   └── agents/
    │       └── code-reviewer/
    │           ├── agent.json
    │           └── PROMPT.md
    ├── java-base/
    │   ├── module.json
    │   ├── ROOT.md
    │   └── skills/
    │       └── junit-testing/
    │           ├── skill.json
    │           └── SKILL.md
    └── flink/
        ├── module.json
        ├── ROOT.md
        └── skills/
            └── flink-streaming/
                ├── skill.json
                ├── SKILL.md
                └── scripts/
                    └── check-topology.sh
```

### Auto-Discovery

- `agkit` discovers modules automatically by scanning immediate subdirectories of `modules/`.
- There is no central catalog file: each module, skill, and agent directory is self-describing via its JSON manifest.
- Every module under `modules/` is selectable by users.
- There is no implicit or magic `base` module: if a module builds on `base`, it must declare `"extends": ["base"]` explicitly.

## 2. Schemas (`snake_case` JSON validated by Zod)

All IDs (`<module-id>`, `<skill-id>`, `<agent-id>`) are derived from their directory name and must be lowercase `kebab-case` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

### `module.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `display_name` | `string` (non-empty) | Yes | Human-readable name displayed in `agkit list` and interactive menus. |
| `description` | `string` (non-empty) | Yes | Short summary of what the module provides. |
| `extends` | `string[]` (kebab-case IDs) | No | Ordered list of parent module IDs. Defaults to `[]`. |

### `skills/<skill-id>/skill.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | `string` (non-empty) | Yes | Concise trigger description rendered into the target harness `SKILL.md` frontmatter. |

### `agents/<agent-id>/agent.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `display_name` | `string` (non-empty) | Yes | Human-readable agent/mode name. |
| `description` | `string` (non-empty) | Yes | Short summary of the agent's role. |
| `when_to_use` | `string` (non-empty) | No | Guidance for when the harness should invoke/suggest this agent (defaults to `description`). |
| `capabilities` | `AgentCapability[]` | No | Internal capability enum: `"read"`, `"edit"`, `"execute"`, `"skill"`, `"subagent"`. Defaults to all capabilities. |
| `file_regex` | `string` (non-empty) | No | Optional file path regex restriction (used by harnesses that support file scoping such as IBM Bob). |

## 3. Module Content Structure

Inside `modules/<module-id>/`, all artifact directories and files are optional except `module.json`:

| Path inside module | Required | Semantics |
| --- | --- | --- |
| `module.json` | Yes | Module metadata and parent dependencies (`extends`). |
| `ROOT.md` | No | Pure Markdown root instructions contributed by this module. |
| `skills/<skill-id>/` | No | Must contain `skill.json` and `SKILL.md` (pure Markdown). Optional companion files (`references/`, `scripts/`, etc.) are copied as-is. |
| `agents/<agent-id>/` | No | Must contain `agent.json` and `PROMPT.md` (pure Markdown). |

### Harness Independence (Ports & Adapters)

Modules are **100% harness-agnostic**. Each harness adapter translates the canonical domain models (`TemplateSkill`, `TemplateAgent`, `rootInstructions`) into its native format and paths:

| Artifact | OpenCode (`opencode`) | Antigravity (`antigravity` / `agy`) | Claude Code (`claude`) | OpenAI Codex (`codex`) | IBM Bob (`bob`) |
| --- | --- | --- | --- | --- | --- |
| `ROOT.md` | `AGENTS.md` | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| `skills/<id>/` | `.opencode/skills/<id>/` | `.agents/skills/<id>/` | `.claude/skills/<id>/` | `.agents/skills/<id>/` | `.bob/skills/<id>/` |
| `agents/<id>/` | `.opencode/agents/<id>.md` | `.agents/agents/<id>.md` | `.claude/agents/<id>.md` | `.codex/agents/<id>.md` | `.bob/custom_modes.yaml` |

## 4. Inheritance & Composition Rules

### Dependency Resolution (`extends`)

1. Starting from the selected module(s), `agkit` resolves all transitive `extends` dependencies into a topological order from ancestors to most specific modules.
2. Diamond dependencies are included once at their earliest topological position.
3. Any cycle or unknown module ID is a hard validation error.

### File Merging & Overrides

- **`ROOT.md` (concatenation)**: Trimmed non-empty `ROOT.md` files are concatenated in layer order separated by `\n\n`, with a single trailing `\n`.
- **`skills/<skill-id>/` (whole-directory override)**: A more specific layer replaces the entire skill definition and companion files from parent layers.
- **`agents/<agent-id>/` (whole-agent override)**: A more specific layer replaces the entire agent definition from parent layers.

## 5. Validation Invariants

`agkit` validates the template repository fail-fast before generating files:

- The `modules/` directory must exist.
- Every module, skill, and agent directory name must be lowercase `kebab-case`.
- Every module must contain a valid `module.json`.
- Every skill directory must contain a valid `skill.json` and `SKILL.md`.
- Every agent directory must contain a valid `agent.json` and `PROMPT.md`.
- Every `extends` reference must point to an existing module, and the dependency graph must be acyclic.
