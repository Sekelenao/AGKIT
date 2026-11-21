---
name: typescript-conventions
description: TypeScript and Node.js coding standards for AGKIT (strict typing, ESM, immutability, error handling, and I/O boundary validation). Use when writing or reviewing TypeScript source files.
---

# TypeScript Conventions

## 1. Strict Typing & Null Safety

- Strict Compiler Baseline: Target `strict: true` and `noUncheckedIndexedAccess: true`.
- Zero `any`: Never use `any`, `@ts-ignore`, or unsafe type assertions (`as Foo`) to silence the compiler. Use `unknown` at I/O boundaries and narrow with explicit type guards or schema validation.
- Explicit Return Types on Exports: Declare explicit parameter and return types on all exported functions and public methods.
- Undefined Over Null: Prefer `undefined` for optional properties and absent return values; normalize `null` only when required by external JSON schemas.

## 2. Immutability & Data Modeling

- Prefer `readonly`: Mark interface properties, class fields (`private readonly`), and array parameters (`readonly string[]`) as `readonly` unless mutation is strictly required.
- Object-Oriented Design: Model domain services, handlers, registries, and commands as explicit classes implementing interfaces (`class Foo implements Bar`) with constructor dependency injection and `private readonly` encapsulation. Keep plain `interface` / `type` definitions for immutable data carriers (DTOs/options/results).
- One Class Per File: Declare at most one exported class per source file, with the file name matching the class name.
- Fail-Fast Boundary Validation: Validate external inputs (`profile.json`, lockfile, global config, CLI options) once at the boundary; do not scatter redundant defensive checks deep inside internal functions.

## 3. ESM & Node Built-ins

- Pure ESM: Use ES modules (`import`/`export`) with explicit relative extensions required by the project `moduleResolution` strategy.
- Mandatory `node:` Prefix: Always import Node.js built-ins with the `node:` prefix (e.g. `node:fs/promises`, `node:path`, `node:crypto`, `node:child_process`).
- Async FS APIs: Use `node:fs/promises` instead of synchronous `*Sync` calls in runtime code.

## 4. Error Handling

- No Silent Catches: Never swallow errors in empty `catch` blocks. Either recover explicitly for a specific expected error code (e.g. `ENOENT`), wrap with contextual information (`{ cause: err }`), or let it propagate.
- Typed Domain Errors: Use dedicated `Error` subclasses (preserving `cause`) for expected user-facing failures (missing config, invalid profile, git failure, conflict).
- Safe `catch` Narrowing: Treat caught values as `unknown` and narrow before accessing `.message` or `.code`.
