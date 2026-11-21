---
name: configuration
description: Rules for designing, validating, and persisting JSON configuration files and schemas in AGKIT using Zod. Use when creating or modifying config DTOs, schemas, stores, or lockfiles.
---

# Configuration

## 1. Schema-First Modeling (Zod)

- Single Source of Truth: Define every JSON configuration structure (`config.json`, `module.json`, lockfile) as a `zod` schema and derive its immutable TypeScript type with `Readonly<z.infer<typeof schema>>`.
- No Manual Type-Checking Chains: Never write manual `if (typeof ...)` or `as Record<string, unknown>` validation logic; express all constraints in the Zod schema.
- Explicit String Constraints: Apply `.trim().min(1)` on required string fields and optional non-empty strings so blank values are rejected at the boundary.

## 2. Naming & Serialization

- Snake Case Keys: Name all JSON configuration keys in `snake_case` (e.g. `git_repository_url`, `default_ref`).
- Pretty Deterministic Output: Serialize JSON files with 2-space indentation and a trailing newline (`JSON.stringify(validated, null, 2) + '\n'`).

## 3. Store & Error Handling

- Boundary Validation on Read and Write: Validate with `safeParse` in both `load()` and `save()` inside the dedicated store class.
- Typed Domain Errors: Map Zod validation failures (`result.error.issues`) and malformed JSON errors to a `CliError` subclass (e.g. `InvalidConfigError`) with field-level diagnostics.
- Absent File Handling: Return `undefined` from `load()` only when the file does not exist (`ENOENT`); never swallow other filesystem errors.

## 4. OS-Agnostic Storage

- Unified User Directory: Store user-level configuration and caches under `AgkitPaths` (`~/.agkit/`) using `node:os` `homedir()` and `node:path` `join()`. Do NOT add OS-specific path branches (`process.platform === 'win32'`, XDG, APPDATA).
