# Agent's guide

Orientation summary and directory map for AI agents collaborating on the AGKIT codebase.

Before performing any task, agents must consult and apply the relevant skills in `.agents/skills/`.

## References

- Project specification: `opencode-templates-cli-spec.md`
- Skills directory: `.agents/skills/`
- Specialized subagents directory: `.agents/agents/`

## Project Architecture

- `src/cli.ts`: Sole composition root; wires services, registers commands, runs `InteractiveRunner` when invoked without subcommands, and handles `CliError` globally.
- `src/command/<name>/`: Pure CLI commands implementing `CliCommand` (no interactive prompts, zero `PromptService` dependency).
- `src/interactive/`: Interactive menu flow (`agkit` with no arguments), delegating to commands.
- `src/prompt/`: `PromptService` abstraction and `@inquirer/prompts` adapter.
- `src/harness/`: `Harness` and capability handler interfaces, shared reusable handlers in `src/harness/shared/`, and one dedicated folder per harness (`src/harness/opencode/`, `src/harness/antigravity/`).
- `src/config/`: `AgkitPaths` (`~/.agkit/`), Zod schemas, and stores.
- `src/git/`: Git repository cache backed by `simple-git` (`GIT_TERMINAL_PROMPT=0`).
- `src/error/`: Base `CliError` carrying `exitCode` and shared CLI error subclasses.

## Dependency Policy

- Standard Libraries Only: Only add widely adopted, actively maintained libraries (`commander`, `@inquirer/prompts`, `zod`, `simple-git`, `vitest`). Avoid obscure or niche packages.
