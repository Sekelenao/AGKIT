import { Chalk } from 'chalk';
import type { TerminalOutputStream } from './terminal-spinner.js';

const LOGO_LINES: readonly string[] = [
  '    _    ____ _  _____ _____',
  '   / \\  / ___| |/ /_ _|_   _|',
  "  / _ \\| |  _| ' / | |  | |",
  ' / ___ \\ |_| | . \\ | |  | |',
  '/_/   \\_\\____|_|\\_\\___| |_|',
];

export class BannerRenderer {
  private readonly version: string;
  private readonly stream: TerminalOutputStream;

  constructor(version: string, stream: TerminalOutputStream = process.stdout) {
    this.version = version;
    this.stream = stream;
  }

  format(useColor = false): string {
    const palette = new Chalk({ level: useColor ? 3 : 0 });
    const subtitle = `v${this.version} · AI Harness Templates`;
    const horizontalPadding = 2;
    const innerWidth = subtitle.length + horizontalPadding * 2;
    const border = '─'.repeat(innerWidth);
    const pad = ' '.repeat(horizontalPadding);

    const logoRows = LOGO_LINES.map((line) => palette.whiteBright(line));
    const topBorder = palette.dim(`╭${border}╮`);
    const bottomBorder = palette.dim(`╰${border}╯`);
    const leftEdge = palette.dim('│');
    const rightEdge = palette.dim('│');
    const subtitleRow = `${leftEdge}${palette.dim(`${pad}${subtitle}${pad}`)}${rightEdge}`;

    return [...logoRows, '', topBorder, subtitleRow, bottomBorder].join('\n');
  }

  render(): void {
    this.stream.write(`${this.format(this.stream.isTTY === true)}\n\n`);
  }
}
