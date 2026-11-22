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

    let inCodeBlock = false;
    const styledLines = markdown.split('\n').map((line) => {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return this.theme.dim(line);
      }
      if (inCodeBlock) {
        return this.theme.secondary(line);
      }
      if (line.startsWith('# ')) {
        return this.theme.accentBold(`${THEME_SYMBOLS.brand} ${line.slice(2)}`);
      }
      if (line.startsWith('## ')) {
        return this.theme.brightBold(line.slice(3));
      }
      if (line.startsWith('### ')) {
        return this.theme.accent(line.slice(4));
      }
      if (line.startsWith('|')) {
        return this.styleInlineCode(line);
      }
      if (line.startsWith('- ')) {
        return `${this.theme.accent('·')} ${this.styleInlineCode(line.slice(2))}`;
      }
      return this.styleInlineCode(line);
    });

    return styledLines.join('\n');
  }

  private styleInlineCode(line: string): string {
    return line.replace(/`([^`]+)`/g, (_match, code: string) => this.theme.accent(code));
  }
}
