# Agent's guide

Before performing any task, consult and apply the relevant skills in `.agents/skills/`.

## References

- Template repository specification: `docs/template-repository.md`
- Skills: `.agents/skills/`
- Subagents: `.agents/agents/`

## Architectural Invariants

- **Single composition root**: Wire services, commands, and harnesses in `src/cli.ts` via constructor dependency injection.
- **Pure CLI commands**: Commands under `src/command/` must remain scriptable with zero dependency on `PromptService`; interactive flows belong in `src/interactive/`.
- **Standard dependencies only**: Only add widely adopted, actively maintained libraries (`commander`, `@inquirer/prompts`, `chalk`, `zod`, `simple-git`, `vitest`). Avoid obscure or niche packages.
