---
name: ui-design-system
description: Locked-in CLI visual design system for AGKIT (Noir & Emerald palette, Compact Split banner, Rail/Timeline prompts, and OutputFormatter). Use whenever creating or modifying CLI commands, prompts, banners, spinners, or terminal output.
---

# UI Design System

## 1. Centralized Theme (Noir & Emerald)

- Single Source of Truth: Import all colors and symbols from `src/ui/ui-theme.ts` (`UiTheme`, `THEME_COLORS`, `THEME_SYMBOLS`). Do NOT import `chalk` directly or hardcode hex/ANSI colors in commands, prompts, or runners.
- Locked Palette: Use only the Noir & Emerald semantic tokens defined in `THEME_COLORS`:
  - `accent` (`#34D399`): brand mark, active prompt prefix `◆`, cursor `❯`, selected checkbox `◉`, validated answers, spinner frames.
  - `secondary` (`#A1A1AA`): metadata values (repository URL, branch, directory).
  - `success` (`#10B981`): completed prompt prefix `◇`, created files `+`, up-to-date status.
  - `warning` (`#F59E0B`): conflict prompt prefix `▲`, backed-up or kept conflict files `!`.
  - `error` (`#EF4444`): error block prefix `■`, deleted files `−`, validation errors.
  - `info` (`#60A5FA`): updated files `~`.
  - `muted` (`#71717A`): unselected choices, descriptions, secondary labels.
  - `dim` (`#3F3F46`): vertical rails `│`, horizontal rules `─`, unchecked boxes `◯`, keyboard hints.
- Non-TTY Safety: Always pass `useColor` derived from `stream.isTTY === true` into `UiTheme`, `BannerRenderer`, and `OutputFormatter`. Never emit ANSI escape codes when output is not a TTY.

## 2. Banner (Compact Split)

- Compact Header Only: Render the interactive header through `BannerRenderer` using the Compact Split layout (`◆ AGKIT`, version, subtitle, horizontal rule, and optional context line with repo/cwd).
- Do NOT reintroduce multi-line ASCII art logos or separate bordered version boxes.

## 3. Prompts (Rail / Timeline)

- Unified Prompt Service: Route all interactive user input through `PromptService` / `InquirerPromptService`.
- Rail Prefixes: Use `◆` (accent) for idle/active prompts, `◇` (success) for completed prompts, and `▲` (warning) for conflict resolution prompts.
- Selection Markers: Use `❯` (accent) for the active cursor, `◉` (accent) for checked items, and `◯` (dim) for unchecked items. Highlight the focused label in bright white and keep unselected labels in `muted`.

## 4. Terminal Output & Errors

- Formatter Required: Format all command summaries, module lists, and `CliError` messages through `OutputFormatter` in `src/ui/output-formatter.ts`. Do NOT print raw unformatted status strings directly from commands or `src/cli.ts`.
- Diff-Style File Markers: Prefix file operation lines with `+` (created, `success`), `~` (updated, `info`), `!` (backup or conflict, `warning`), and `−` (deleted, `error`).
- Error Blocks: Render `CliError` instances via `OutputFormatter.formatError()` using the `■ ERROR` prefix on `stderr`.

## 5. Examples

See `.agents/skills/ui-design-system/examples/formatted-output.ts` for compliant usage of `UiTheme` and `OutputFormatter`.
