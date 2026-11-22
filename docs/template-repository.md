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
- Every module under `modules/` is independent and selectable by users.
- There is no implicit `base` module and no module inheritance: users explicitly select the exact combination of modules they want.

## 2. Schemas (`snake_case` JSON validated by Zod)

All IDs (`<module-id>`, `<skill-id>`, `<agent-id>`) are derived from their directory name and must be lowercase `kebab-case` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

### `module.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `display_name` | `string` (non-empty) | Yes | Human-readable name displayed in `agkit list` and interactive menus. |
| `description` | `string` (non-empty) | Yes | Short summary of what the module provides. |

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
| ---          | --- | --- |
| `module.json` | Yes | Module metadata (`display_name`, `description`). |
| `ROOT.md` | No | Pure Markdown root instructions contributed by this module. |
| `skills/<skill-id>/` | No | Must contain `skill.json` and `SKILL.md` (pure Markdown). Optional companion files (`references/`, `scripts/`, etc.) are copied as-is. |
| `agents/<agent-id>/` | No | Must contain `agent.json` and `PROMPT.md` (pure Markdown). |

### Harness Independence (Ports & Adapters)

Modules are **100% harness-agnostic**. Each harness adapter translates the canonical domain models (`TemplateSkill`, `TemplateAgent`, `rootInstructions`) into its native format and paths:

| Harness | `--harness` | Root (`ROOT.md`) | Skills (`skills/<id>/`) | Agents (`agents/<id>/`) |
| --- | --- | --- | --- | --- |
| OpenCode | `opencode` | `AGENTS.md` | `.opencode/skills/<id>/` | `.opencode/agents/<id>.md` |
| Antigravity | `antigravity`, `agy` | `AGENTS.md` | `.agents/skills/<id>/` | `.agents/agents/<id>.md` |
| Claude Code | `claude` | `CLAUDE.md` | `.claude/skills/<id>/` | `.claude/agents/<id>.md` |
| OpenAI Codex | `codex` | `AGENTS.md` | `.agents/skills/<id>/` | `.codex/agents/<id>.md` |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md` | `.github/skills/<id>/` | `.github/agents/<id>.agent.md` |
| Cursor | `cursor` | `AGENTS.md` | `.cursor/skills/<id>/` | `.cursor/agents/<id>.md` |
| IBM Bob | `bob` | `AGENTS.md` | `.bob/skills/<id>/` | `.bob/custom_modes.yaml` |

## 4. Composition Rules

### Module Selection

1. Users explicitly select one or more modules (e.g. `agkit init -m base java-base flink`).
2. Selected modules are applied in selection order, with duplicate module IDs deduplicated at their first occurrence.
3. Any unknown module ID is a hard validation error.

### File Merging & Collisions

- **`ROOT.md` (concatenation)**: Trimmed non-empty `ROOT.md` files are concatenated in selection order separated by `\n\n`, with a single trailing `\n`.
- **`skills/<skill-id>/` (fail-fast on collision)**: Skill IDs must be unique across all selected modules. Selecting multiple modules that define the same skill ID is a hard validation error.
- **`agents/<agent-id>/` (fail-fast on collision)**: Agent IDs must be unique across all selected modules. Selecting multiple modules that define the same agent ID is a hard validation error.

## 5. Validation Invariants

`agkit` validates the template repository fail-fast before generating files:

- The `modules/` directory must exist.
- Every module, skill, and agent directory name must be lowercase `kebab-case`.
- Every module must contain a valid `module.json`.
- Every skill directory must contain a valid `skill.json` and `SKILL.md`.
- Every agent directory must contain a valid `agent.json` and `PROMPT.md`.
- Selected modules must not define colliding skill IDs or agent IDs.
