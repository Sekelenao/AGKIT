# Changelog

All notable user-facing changes to this project are documented in this file.

> [!NOTE]
> This changelog strictly documents changes that directly impact the end user (CLI commands, configuration schemas, harness rendering, runtime behavior, and bug fixes). Pure internal refactorings, private class movements, and minor documentation or typo fixes are intentionally omitted.

### Legend
- 🔴 **Breaking Change**: Incompatible CLI, configuration schema, or behavioral change requiring migration.
- 🟢 **Feature / Added**: New capability, CLI command/option, harness support, or configuration property.
- 🔵 **Fix / Robustness**: Bug fix, boundary safeguard, or improved diagnostic message impacting user experience.

---

## [Unreleased]

### 🟢 Features & Enhancements
- **Optional `mode` & `skills` Fields in `agent.json`**: Added optional `mode` (`"subagent" | "primary" | "all"`) and `skills` (`string[]` of lowercase kebab-case skill IDs) to the agent manifest schema, validated fail-fast with Zod.
- **Per-Harness Agent Capability, Mode & Skill Mapping**: Translated `agent.json` metadata into native agent definitions across all supported harnesses:
  - **Antigravity CLI**: Emits CLI `tools:` when `capabilities` is restricted, `subagent`/`mainAgent` flags from `mode`, and `skills/<id>` entries.
  - **Claude Code**: Emits `disallowedTools:` for omitted capabilities (preserving MCP and additional tools when unrestricted) and bare `<id>` `skills:` entries.
  - **OpenCode**: Emits `mode:` and `permission:` deny entries for omitted capabilities.
  - **GitHub Copilot**: Emits `tools:` when `capabilities` is restricted.
  - **Cursor**: Emits `readonly: true` when `edit` is omitted.
  - **OpenAI Codex**: Emits `sandbox_mode` (`"read-only"` or `"workspace-write"`) based on `edit`.

### 🔵 Fixes & Diagnostics
- **OpenAI Codex Custom Agent Format**: Fixed Codex agent generation to write TOML files (`.codex/agents/<id>.toml`) with `name`, `description`, `sandbox_mode`, and `developer_instructions` instead of Markdown `.md` files.

---

## [0.1.0]

### 🟢 Features & Enhancements
- **Initial Release of `@sekelenao/agkit-cli`**: Interactive TUI (`agkit`) and scriptable CLI commands (`new`, `config`, `list`, `init`, `sync`, `spec`, `reset`).
- **Multi-Harness Support**: Harness-agnostic template composition and rendering for OpenCode, Antigravity CLI, Claude Code, OpenAI Codex, GitHub Copilot, Cursor, and IBM Bob.
- **Conflict-Safe Synchronization**: SHA-256 project manifest (`.agkit.json`) with automatic updates for unmodified files and interactive diff preview with Keep, Overwrite, or Timestamped Backup for locally modified files.
