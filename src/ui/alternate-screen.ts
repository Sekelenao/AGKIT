import type { TerminalOutputStream } from './terminal-spinner.js';

const ENTER_ALTERNATE_SCREEN = '\x1b[?1049h\x1b[2J\x1b[H';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const EXIT_ALTERNATE_SCREEN = '\x1b[?1049l';

export class AlternateScreen {
  private readonly stream: TerminalOutputStream;

  constructor(stream: TerminalOutputStream = process.stdout) {
    this.stream = stream;
  }

  getRows(): number | undefined {
    return this.stream.isTTY === true ? this.stream.rows : undefined;
  }

  clear(): void {
    if (this.stream.isTTY === true) {
      this.stream.write(CLEAR_SCREEN);
    }
  }

  writeLines(lines: readonly string[]): void {
    if (lines.length === 0) {
      return;
    }
    this.stream.write(`${lines.join('\n')}\n\n`);
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.stream.isTTY !== true) {
      return task();
    }

    let restored = false;
    const restore = (): void => {
      if (!restored) {
        restored = true;
        this.stream.write(EXIT_ALTERNATE_SCREEN);
      }
    };

    const handleSignal = (): void => {
      restore();
    };

    this.stream.write(ENTER_ALTERNATE_SCREEN);
    process.once('SIGINT', handleSignal);
    process.once('SIGTERM', handleSignal);

    try {
      return await task();
    } finally {
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
      restore();
    }
  }
}
