import type { TerminalOutputStream } from './terminal-spinner.js';

const LOGO_LINES: readonly string[] = [
  '    _    ____ _  _____ _____',
  '   / \\  / ___| |/ /_ _|_   _|',
  "  / _ \\| |  _| ' / | |  | |",
  ' / ___ \\ |_| | . \\ | |  | |',
  '/_/   \\_\\____|_|\\_\\___| |_|',
];

const ANSI_RESET = '\x1b[0m';
const ANSI_WHITE = '\x1b[97m';
const ANSI_DIM = '\x1b[2m';

export class BannerRenderer {
  private readonly version: string;
  private readonly stream: TerminalOutputStream;

  constructor(version: string, stream: TerminalOutputStream = process.stdout) {
    this.version = version;
    this.stream = stream;
  }

  format(useColor = false): string {
    const subtitle = `v${this.version} · AI Harness Templates`;
    const horizontalPadding = 2;
    const innerWidth = subtitle.length + horizontalPadding * 2;
    const border = '─'.repeat(innerWidth);
    const pad = ' '.repeat(horizontalPadding);

    const paint = (text: string, color: string): string =>
      useColor ? `${color}${text}${ANSI_RESET}` : text;

    const logoRows = LOGO_LINES.map((line) => paint(line, ANSI_WHITE));
    const topBorder = paint(`╭${border}╮`, ANSI_DIM);
    const bottomBorder = paint(`╰${border}╯`, ANSI_DIM);
    const leftEdge = paint('│', ANSI_DIM);
    const rightEdge = paint('│', ANSI_DIM);
    const subtitleRow = `${leftEdge}${paint(`${pad}${subtitle}${pad}`, ANSI_DIM)}${rightEdge}`;

    return [...logoRows, '', topBorder, subtitleRow, bottomBorder].join('\n');
  }

  render(): void {
    this.stream.write(`${this.format(this.stream.isTTY === true)}\n\n`);
  }
}
