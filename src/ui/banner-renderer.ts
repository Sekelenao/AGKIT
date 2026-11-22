import { homedir } from 'node:os';
import type { TerminalOutputStream } from './terminal-spinner.js';
import { THEME_SYMBOLS, UiTheme } from './ui-theme.js';

export interface BannerContext {
  readonly repoUrl?: string;
  readonly ref?: string;
  readonly cwd?: string;
}

const DEFAULT_RULE_WIDTH = 62;

export class BannerRenderer {
  private readonly version: string;
  private readonly stream: TerminalOutputStream;

  constructor(version: string, stream: TerminalOutputStream = process.stdout) {
    this.version = version;
    this.stream = stream;
  }

  format(useColor = false, context?: BannerContext): string {
    const theme = new UiTheme(useColor);
    const title = theme.accentBold(`${THEME_SYMBOLS.brand} AGKIT`);
    const version = theme.accent(`v${this.version}`);
    const subtitle = theme.muted('AI Harness Templates');
    const headerRow = `${title}  ${version}  ${subtitle}`;
    const ruleRow = theme.rule(DEFAULT_RULE_WIDTH);

    const contextSegments: string[] = [];
    if (context?.repoUrl !== undefined) {
      const refSuffix =
        context.ref === undefined ? '' : ` ${theme.dim(`(${context.ref})`)}`;
      contextSegments.push(
        `${theme.dim('repo')} ${theme.secondary(context.repoUrl)}${refSuffix}`,
      );
    }
    if (context?.cwd !== undefined) {
      contextSegments.push(
        `${theme.dim('dir')} ${theme.secondary(this.shortenHome(context.cwd))}`,
      );
    }

    if (contextSegments.length === 0) {
      return [headerRow, ruleRow].join('\n');
    }

    const contextRow = contextSegments.join(`  ${theme.dim('·')}  `);
    return [headerRow, ruleRow, contextRow].join('\n');
  }

  render(context?: BannerContext): void {
    this.stream.write(`${this.format(this.stream.isTTY === true, context)}\n\n`);
  }

  private shortenHome(pathValue: string): string {
    const home = homedir();
    if (pathValue === home) {
      return '~';
    }
    if (pathValue.startsWith(`${home}/`)) {
      return `~${pathValue.slice(home.length)}`;
    }
    return pathValue;
  }
}
