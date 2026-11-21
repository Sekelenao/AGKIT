---
name: command-execution
description: Rules for shell command execution without subshells ($(...), backticks) to preserve user-whitelisted permissions. Use whenever running terminal commands.
---

# Command Execution

## Strict Rules

- No Command Substitution: Never use `$(...)` or backticks inside shell commands.
- Two-Step Resolution: Resolve paths, IDs, or arguments first using native tools or a read command, then invoke the target command with explicit literal arguments.
- Native File Reading: Never use `cat`, `head`, `tail`, or `less` via `run_command` to inspect files. Always use `read_file`.
- Native File Writing: Never use shell redirections (`>`, `>>`, `<<EOF`) to create or edit files. Always use `write_file` or `edit_file`.
- Deterministic Chaining: Chain deterministic commands with `&&` (e.g. `npm run typecheck && npx vitest run path/to/file.test.ts`), provided no dynamic substitutions are used.
- Explicit Working Directory: Avoid `cd` inside commands when a tool or CLI flag (`git -C`, `npm --prefix`) accepts a target path directly.
