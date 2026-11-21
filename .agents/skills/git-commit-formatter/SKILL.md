---
name: git-commit-formatter
description: Formats git commit messages according to the Conventional Commits specification. Use when committing changes or drafting a commit message.
---

# Git Commit Formatter

## Format

Use `<type>[optional scope]: <description>`.

## Allowed Types

- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation only changes.
- `style`: Formatting or whitespace changes with no semantic impact.
- `refactor`: Code restructuring that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or fixing existing tests.
- `chore`: Build process, tooling, dependencies, or auxiliary configuration changes.

## Rules

- Analyze the staged diff to determine the primary `type` and optional `scope`.
- Write a concise `description` in imperative mood (e.g. `add sync command`, not `added sync command`).
- Keep the subject line under 72 characters without a trailing period.
- Add a `BREAKING CHANGE:` footer when introducing breaking changes.
