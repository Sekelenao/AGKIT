import type { ConfigResult } from '../command/config/config-command.js';
import type { InitResult } from '../command/init/init-command.js';
import type { ResetResult } from '../command/reset/reset-command.js';
import type { SyncResult } from '../command/sync/sync-command.js';
import type { TemplateModule } from '../template/template-module.js';
import { THEME_SYMBOLS, UiTheme } from './ui-theme.js';

const LIST_RULE_WIDTH = 62;

export class OutputFormatter {
  private readonly theme: UiTheme;
  private readonly useColor: boolean;

  constructor(useColor = false) {
    this.useColor = useColor;
    this.theme = new UiTheme(useColor);
  }

  formatInitSummary(result: InitResult): readonly string[] {
    const count = result.writtenFiles.length;
    const noun = count === 1 ? 'file' : 'files';
    const lines: string[] = [
      `${this.theme.success(THEME_SYMBOLS.done)}  ${this.theme.brightBold(`Initialized ${count} managed ${noun}`)}`,
    ];

    for (const file of result.writtenFiles) {
      lines.push(
        `   ${this.theme.successBold(THEME_SYMBOLS.created)}  ${this.theme.bright(file)}`,
      );
    }

    return lines;
  }

  formatSyncSummary(result: SyncResult): readonly string[] {
    const totalChanges =
      result.createdFiles.length +
      result.updatedFiles.length +
      result.deletedFiles.length +
      result.keptConflictFiles.length;

    if (totalChanges === 0) {
      return [
        `${this.theme.success(THEME_SYMBOLS.done)}  ${this.theme.muted('Already up to date.')}`,
      ];
    }

    const parts: string[] = [];
    if (result.createdFiles.length > 0) {
      parts.push(`${result.createdFiles.length} created`);
    }
    if (result.updatedFiles.length > 0) {
      parts.push(`${result.updatedFiles.length} updated`);
    }
    if (result.backedUpFiles.length > 0) {
      parts.push(`${result.backedUpFiles.length} backed up`);
    }
    if (result.deletedFiles.length > 0) {
      parts.push(`${result.deletedFiles.length} deleted`);
    }
    if (result.keptConflictFiles.length > 0) {
      parts.push(`${result.keptConflictFiles.length} conflict`);
    }

    const headerSymbol =
      result.keptConflictFiles.length > 0
        ? this.theme.warning(THEME_SYMBOLS.warning)
        : this.theme.success(THEME_SYMBOLS.done);

    const lines: string[] = [
      `${headerSymbol}  ${this.theme.brightBold('Sync complete')} ${this.theme.muted(`(${parts.join(' · ')})`)}`,
    ];

    for (const file of result.createdFiles) {
      lines.push(
        `   ${this.theme.successBold(THEME_SYMBOLS.created)}  ${this.theme.bright(file)}  ${this.theme.dim('created')}`,
      );
    }
    for (const file of result.backedUpFiles) {
      lines.push(
        `   ${this.theme.warningBold(THEME_SYMBOLS.conflict)}  ${this.theme.secondary(file)}  ${this.theme.dim('backed up')}`,
      );
    }
    for (const file of result.updatedFiles) {
      lines.push(
        `   ${this.theme.infoBold(THEME_SYMBOLS.updated)}  ${this.theme.bright(file)}  ${this.theme.dim('updated')}`,
      );
    }
    for (const file of result.deletedFiles) {
      lines.push(
        `   ${this.theme.errorBold(THEME_SYMBOLS.deleted)}  ${this.theme.muted(file)}  ${this.theme.dim('deleted')}`,
      );
    }
    for (const file of result.keptConflictFiles) {
      lines.push(
        `   ${this.theme.warningBold(THEME_SYMBOLS.conflict)}  ${this.theme.warning(file)}  ${this.theme.dim('conflict (kept local)')}`,
      );
    }

    return lines;
  }

  formatConfigSummary(result: ConfigResult): readonly string[] {
    const refSuffix =
      result.config.default_ref === undefined
        ? ''
        : ` ${this.theme.dim(`(${result.config.default_ref})`)}`;

    return [
      `${this.theme.success(THEME_SYMBOLS.done)}  ${this.theme.brightBold('Configured repository')}  ${this.theme.accent(result.config.git_repository_url)}${refSuffix}`,
      `${this.theme.dim(THEME_SYMBOLS.end)}  ${this.theme.muted('Local cache')}  ${this.theme.secondary(result.cacheDir)}`,
    ];
  }

  formatModuleList(modules: readonly TemplateModule[]): readonly string[] {
    if (modules.length === 0) {
      return [
        `${this.theme.muted(THEME_SYMBOLS.done)}  ${this.theme.muted('No template modules found.')}`,
      ];
    }

    const maxIdWidth = Math.max(...modules.map((mod) => mod.id.length));
    const maxNameWidth = Math.max(...modules.map((mod) => mod.displayName.length));

    const lines: string[] = [
      `${this.theme.accentBold(`${THEME_SYMBOLS.brand} Available Template Modules`)}  ${this.theme.dim(`(${modules.length})`)}`,
      this.theme.rule(LIST_RULE_WIDTH),
    ];

    for (const mod of modules) {
      const paddedId = mod.id.padEnd(maxIdWidth);
      const paddedName = mod.displayName.padEnd(maxNameWidth);
      const extendsSuffix =
        mod.extends.length > 0
          ? ` ${this.theme.dim(`[extends: ${mod.extends.join(', ')}]`)}`
          : '';
      lines.push(
        `  ${this.theme.accent(paddedId)}  ${this.theme.bright(paddedName)}  ${this.theme.muted(mod.description)}${extendsSuffix}`,
      );
    }

    return lines;
  }

  formatResetSummary(result: ResetResult): readonly string[] {
    if (result.removedPaths.length === 0) {
      return [
        `${this.theme.muted(THEME_SYMBOLS.done)}  ${this.theme.muted('Nothing to reset.')}`,
      ];
    }

    const lines: string[] = [
      `${this.theme.success(THEME_SYMBOLS.done)}  ${this.theme.brightBold('Reset complete')}`,
    ];
    for (const removedPath of result.removedPaths) {
      lines.push(
        `   ${this.theme.errorBold(THEME_SYMBOLS.deleted)}  ${this.theme.muted(removedPath)}`,
      );
    }
    return lines;
  }

  formatError(message: string): string {
    return `${this.theme.errorBold(`${THEME_SYMBOLS.error} ERROR`)}  ${this.theme.bright(message)}`;
  }

  formatMarkdownDocument(markdown: string): string {
    if (!this.useColor) {
      return markdown;
    }

    const rawLines = markdown.split('\n');
    const output: string[] = [];
    let inCodeBlock = false;
    let index = 0;

    while (index < rawLines.length) {
      const line = rawLines[index] ?? '';

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        output.push(this.theme.dim(line));
        index += 1;
        continue;
      }

      if (inCodeBlock) {
        output.push(this.theme.secondary(line));
        index += 1;
        continue;
      }

      if (line.trimStart().startsWith('|')) {
        const tableLines: string[] = [];
        while (index < rawLines.length && (rawLines[index] ?? '').trimStart().startsWith('|')) {
          tableLines.push(rawLines[index] ?? '');
          index += 1;
        }
        output.push(...this.formatMarkdownTable(tableLines));
        continue;
      }

      if (line.startsWith('# ')) {
        output.push(this.theme.accentBold(`${THEME_SYMBOLS.brand} ${line.slice(2)}`));
      } else if (line.startsWith('## ')) {
        output.push(this.theme.brightBold(line.slice(3)));
      } else if (line.startsWith('### ')) {
        output.push(this.theme.accent(line.slice(4)));
      } else if (line.startsWith('- ')) {
        output.push(`${this.theme.accent('·')} ${this.styleInlineMarkdown(line.slice(2))}`);
      } else {
        output.push(this.styleInlineMarkdown(line));
      }

      index += 1;
    }

    return output.join('\n');
  }

  private formatMarkdownTable(tableLines: readonly string[]): readonly string[] {
    const parsedRows = tableLines
      .map((line) => this.parseTableRow(line))
      .filter((cells) => cells.length > 0);

    const dataRows = parsedRows.filter(
      (cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)),
    );
    if (dataRows.length === 0) {
      return tableLines;
    }

    const columnCount = Math.max(...dataRows.map((row) => row.length));
    const columnWidths: number[] = Array.from({ length: columnCount }, () => 0);

    for (const row of dataRows) {
      for (let col = 0; col < columnCount; col += 1) {
        const plain = this.stripInlineMarkdown(row[col] ?? '');
        const current = columnWidths[col] ?? 0;
        if (plain.length > current) {
          columnWidths[col] = plain.length;
        }
      }
    }

    const separator = ` ${this.theme.dim('│')} `;
    const divider = columnWidths
      .map((width) => this.theme.dim(THEME_SYMBOLS.rule.repeat(width)))
      .join(this.theme.dim('─┼─'));

    const formatted: string[] = [];
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
      const row = dataRows[rowIndex] ?? [];
      const cells = columnWidths.map((width, col) => {
        const rawCell = row[col] ?? '';
        const visibleLength = this.stripInlineMarkdown(rawCell).length;
        const padding = ' '.repeat(Math.max(0, width - visibleLength));
        const styled =
          rowIndex === 0
            ? this.theme.brightBold(this.stripInlineMarkdown(rawCell))
            : this.styleInlineMarkdown(rawCell);
        return `${styled}${padding}`;
      });
      formatted.push(`  ${cells.join(separator)}`);
      if (rowIndex === 0) {
        formatted.push(`  ${divider}`);
      }
    }

    return formatted;
  }

  private parseTableRow(line: string): readonly string[] {
    const trimmed = line.trim();
    const withoutEdges = trimmed.replace(/^\|/, '').replace(/\|$/, '');
    return withoutEdges.split('|').map((cell) => cell.trim());
  }

  private stripInlineMarkdown(text: string): string {
    return text.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
  }

  private styleInlineMarkdown(line: string): string {
    return line
      .replace(/`([^`]+)`/g, (_match, code: string) => this.theme.accent(code))
      .replace(/\*\*([^*]+)\*\*/g, (_match, bold: string) => this.theme.brightBold(bold));
  }
}
