import { Chalk, type ChalkInstance } from 'chalk';

export const THEME_COLORS = {
  accent: '#34D399',
  secondary: '#A1A1AA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#60A5FA',
  muted: '#71717A',
  dim: '#3F3F46',
} as const;

export const THEME_SYMBOLS = {
  brand: '◆',
  active: '◆',
  done: '◇',
  rail: '│',
  end: '└',
  warning: '▲',
  error: '■',
  cursor: '❯',
  checked: '◉',
  unchecked: '◯',
  created: '+',
  updated: '~',
  deleted: '−',
  conflict: '!',
  rule: '─',
} as const;

export class UiTheme {
  private readonly palette: ChalkInstance;

  constructor(useColor = true) {
    this.palette = new Chalk({ level: useColor ? 3 : 0 });
  }

  accent(text: string): string {
    return this.palette.hex(THEME_COLORS.accent)(text);
  }

  accentBold(text: string): string {
    return this.palette.hex(THEME_COLORS.accent).bold(text);
  }

  secondary(text: string): string {
    return this.palette.hex(THEME_COLORS.secondary)(text);
  }

  success(text: string): string {
    return this.palette.hex(THEME_COLORS.success)(text);
  }

  successBold(text: string): string {
    return this.palette.hex(THEME_COLORS.success).bold(text);
  }

  warning(text: string): string {
    return this.palette.hex(THEME_COLORS.warning)(text);
  }

  warningBold(text: string): string {
    return this.palette.hex(THEME_COLORS.warning).bold(text);
  }

  error(text: string): string {
    return this.palette.hex(THEME_COLORS.error)(text);
  }

  errorBold(text: string): string {
    return this.palette.hex(THEME_COLORS.error).bold(text);
  }

  info(text: string): string {
    return this.palette.hex(THEME_COLORS.info)(text);
  }

  infoBold(text: string): string {
    return this.palette.hex(THEME_COLORS.info).bold(text);
  }

  bright(text: string): string {
    return this.palette.whiteBright(text);
  }

  brightBold(text: string): string {
    return this.palette.whiteBright.bold(text);
  }

  muted(text: string): string {
    return this.palette.hex(THEME_COLORS.muted)(text);
  }

  dim(text: string): string {
    return this.palette.hex(THEME_COLORS.dim)(text);
  }

  rule(width: number): string {
    return this.dim(THEME_SYMBOLS.rule.repeat(width));
  }
}
