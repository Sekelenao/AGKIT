---
name: testing
description: Rules for writing and running Vitest unit and integration tests in AGKIT. Use when creating, updating, or running tests.
---

# Testing

## 1. Local Targeted Execution

- Target Specific Files: During development, run only the affected test file via `npx vitest run path/to/file.test.ts` instead of running the full suite repeatedly.
- Single Run Mode: Always pass `run` (`npx vitest run ...`) so Vitest exits immediately instead of hanging in watch mode.
- Full Verification Before Commit: Run `npm run typecheck`, `npm run build`, and `npm test` once before finalizing changes.

## 2. Real I/O Over Fragile Mocks

- Real Temporary Directories: Test filesystem, config store, and command operations against real isolated temporary directories created with `fs.mkdtemp` and removed in `afterEach` via `fs.rm(dir, { recursive: true, force: true })`.
- Real Local Git Repos: Test git cache and sync workflows against real local bare git repositories created with `simple-git` inside a temporary directory instead of mocking git commands.
- No Mock Tautologies: Never mock the class under test or assert solely that a mock was called with the exact values it was stubbed to return.

## 3. Quality, Isolation & Contracts

- Anti-Compiler Tautologies: Never write tests that merely verify TypeScript types, standard library behavior, or trivial property getters without logic. Every test must fail if a realistic bug or mutation is introduced in production code.
- Strict Isolation: Never touch the real `~/.agkit/` directory or `process.cwd()`. Always inject an isolated `AgkitPaths(tempDir)` and explicit `targetDir`.
- Observable Contracts Only: Assert on observable results, written files, persisted config, and typed `CliError` subclasses rather than internal implementation details.

## 4. Parameterized Tests (The Goldilocks Rule)

- Consolidate Same Invariant: Use `it.each` to consolidate repetitive cases testing the exact same invariant with different inputs (e.g. invalid harness names, invalid config payloads).
- Keep Distinct Concepts Separate: Never merge distinct business behaviors or outcomes into one generic `it.each` table solely to reduce line count.
