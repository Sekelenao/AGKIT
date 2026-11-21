# Template Repository Specification

This document defines the structure, metadata schema, resolution rules, and validation invariants of a central Git template repository consumed by `agkit`.

## 1. Repository Layout

All composable modules live inside a dedicated `modules/` directory at the root of the template repository. The repository root itself remains free for documentation, CI workflows, scripts, or tooling.

```text
templates-repo/
├── README.md
└── modules/
    ├── base/
    │   ├── module.json
    │   ├── ROOT.md
    │   ├── skills/
    │   │   └── git-conventions/
    │   │       ├── SKILL.md
    │   │       └── references/
    │   │           └── commit-examples.md
    │   └── agents/
    │       └── code-reviewer.md
    ├── java-base/
    │   ├── module.json
    │   ├── ROOT.md
    │   └── skills/
    │       └── junit-testing/
    │           └── SKILL.md
    ├── flink/
    │   ├── module.json
    │   ├── ROOT.md
    │   └── skills/
    │       └── flink-streaming/
    │           ├── SKILL.md
    │           └── scripts/
    │               └── check-topology.sh
    └── front/
        ├── module.json
        ├── ROOT.md
        └── skills/
            └── react-conventions/
                └── SKILL.md
```

### Auto-Discovery

- `agkit` discovers modules automatically by scanning immediate subdirectories of `modules/`.
- There is no central catalog file: each module directory is self-describing via its `module.json`.
- Every module under `modules/` is selectable by users (there is no `abstract` or hidden module concept).
- There is no implicit or magic `base` module: if a module builds on `base`, it must declare `"extends": ["base"]` explicitly.

## 2. Module Identity & `module.json` Schema

The canonical **module ID** is the directory name under `modules/` (single source of truth).

- Module IDs must use lowercase `kebab-case` (e.g. `base`, `java-base`, `flink`, `spring-boot`), matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Every module directory **must** contain a `module.json` file with `snake_case` keys:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `display_name` | `string` (trimmed, non-empty) | Yes | Human-readable name displayed in `agkit list` and interactive menus. |
| `description` | `string` (trimmed, non-empty) | Yes | Short summary of what the module provides. |
| `extends` | `string[]` (trimmed, non-empty IDs) | No | Ordered list of parent module IDs this module depends on. Defaults to `[]`. |

### Example `module.json`

```json
{
  "display_name": "Apache Flink",
  "description": "Streaming conventions, skills, and agents for Flink jobs",
  "extends": ["java-base"]
}
```

## 3. Module Content Structure

Inside `modules/<module-id>/`, all artifact directories and files are optional (except `module.json`):

| Path inside module | Required | Semantics |
| --- | --- | --- |
| `module.json` | Yes | Module metadata and parent dependencies (`extends`). |
| `ROOT.md` | No | Root project instructions contributed by this module. |
| `skills/<skill-name>/` | No | Skill directory. Must contain a `SKILL.md` file and may contain optional companion files/directories (`references/`, `scripts/`, etc.) copied as-is. |
| `agents/<agent-name>.md` | No | Specialized subagent definition file. |

### Harness Independence

Modules are **100% harness-agnostic** in v1. Authors write standard Markdown artifacts once, and `agkit` delegates physical placement in the target project to the selected `Harness`:

| Module artifact | OpenCode (`opencode`) | Antigravity (`antigravity` / `agy`) |
| --- | --- | --- |
| `ROOT.md` | `AGENTS.md` | `AGENTS.md` |
| `skills/<name>/**` | `.opencode/skills/<name>/**` | `.agents/skills/<name>/**` |
| `agents/<name>.md` | `.opencode/agents/<name>.md` | `.agents/agents/<name>.md` |

## 4. Inheritance & Composition Rules

### Dependency Resolution (`extends`)

Modules form a Directed Acyclic Graph (DAG) via `extends`:

1. Starting from the user-selected module(s) (one or more, e.g. `["flink"]` or `["flink", "front"]`), `agkit` resolves all transitive `extends` dependencies.
2. Modules are ordered topologically from **least specific (ancestors)** to **most specific (selected modules)**, preserving declared order deterministically.
3. Duplicate modules reached through multiple paths (diamond dependencies, e.g. `flink` and `front` both extending `base`) are included **once** at their earliest topological position.
4. Any cycle in `extends` or reference to an unknown module ID is a hard validation error.

For example, selecting `["flink", "front"]` where `flink -> java-base -> base` and `front -> base` resolves to:

```text
base → java-base → flink → front
```

### File Merging & Overrides

Layers are applied in resolved topological order:

- **`ROOT.md` (concatenation)**:
  - Each module's `ROOT.md` (if present, trimmed of leading/trailing blank lines) is concatenated in layer order, separated by a blank line (`\n\n`), with a single trailing newline (`\n`).
  - No extra separators (`---`) or HTML comments are injected.
- **`skills/<skill-name>/` (whole-directory override)**:
  - If a more specific layer defines a skill with the same `<skill-name>`, it **replaces the entire skill directory** from earlier layers (including companion files like `references/` or `scripts/`) so stale files from parent layers never leak.
- **`agents/<agent-name>.md` (file override)**:
  - If a more specific layer defines an agent with the same `<agent-name>`, it replaces the earlier layer's file.

## 5. Validation Invariants

`agkit` validates the template repository fail-fast before generating files:

- The `modules/` directory must exist in the template repository.
- Every subdirectory inside `modules/` must have a valid `kebab-case` name and contain a valid `module.json` conforming to the Zod schema.
- Every module ID listed in `extends` must exist in `modules/`.
- The `extends` graph must be acyclic.
- Every subdirectory inside `skills/` must contain a `SKILL.md` file.
- Non-`.md` entries inside `agents/` (such as `.gitkeep`) are ignored.

## 6. Out of Scope for v1

The following capabilities are intentionally excluded from v1 to keep the template format minimal and predictable, and may be added in future versions without breaking v1 repositories:

- **Template variables / interpolation** (e.g. `{{project_name}}`): all v1 templates are static.
- **Harness-specific overrides** inside modules (e.g. per-harness subdirectories).
- **Commands (`commands/`)**: will be added once a `CommandHandler` is introduced across harnesses.
