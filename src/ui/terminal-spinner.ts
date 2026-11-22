import type { ProgressReporter } from './progress-reporter.js';
import { UiTheme } from './ui-theme.js';

export interface TerminalOutputStream {
  readonly isTTY?: boolean;
  write(chunk: string): boolean;
}

const SPINNER_FRAMES: readonly string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CLEAR_LINE_SEQUENCE = '\r\x1b[2K';
const ttyTheme = new UiTheme(true);

export class TerminalSpinner implements ProgressReporter {
  private readonly stream: TerminalOutputStream;
  private readonly intervalMs: number;

  constructor(stream: TerminalOutputStream = process.stderr, intervalMs = 80) {
    this.stream = stream;
    this.intervalMs = intervalMs;
  }

  async run<T>(message: string, task: () => Promise<T>): Promise<T> {
    if (this.stream.isTTY !== true) {
      return task();
    }

    let frameIndex = 0;
    const render = (): void => {
      const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length] ?? SPINNER_FRAMES[0] ?? '⠋';
      frameIndex += 1;
      this.stream.write(`\r${ttyTheme.accent(frame)}  ${ttyTheme.bright(message)}`);
    };

    render();
    const timer = setInterval(render, this.intervalMs);

    try {
      return await task();
    } finally {
      clearInterval(timer);
      this.stream.write(CLEAR_LINE_SEQUENCE);
    }
  }
}
