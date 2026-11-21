import { describe, expect, it } from 'vitest';
import {
  type TerminalOutputStream,
  TerminalSpinner,
} from '../../src/ui/terminal-spinner.js';

function createFakeStream(isTTY: boolean): {
  readonly stream: TerminalOutputStream;
  readonly chunks: string[];
} {
  const chunks: string[] = [];
  return {
    chunks,
    stream: {
      isTTY,
      write(chunk: string): boolean {
        chunks.push(chunk);
        return true;
      },
    },
  };
}

describe('TerminalSpinner', () => {
  it('renders spinner output and clears the line when running in a TTY', async () => {
    const { stream, chunks } = createFakeStream(true);
    const spinner = new TerminalSpinner(stream, 10);

    const result = await spinner.run('Syncing template repository...', async () => 'done');

    expect(result).toBe('done');
    expect(chunks[0]).toContain('Syncing template repository...');
    expect(chunks[chunks.length - 1]).toBe('\r\x1b[2K');
  });

  it('clears the line and rethrows when the task fails in a TTY', async () => {
    const { stream, chunks } = createFakeStream(true);
    const spinner = new TerminalSpinner(stream, 10);

    await expect(
      spinner.run('Cloning...', async () => {
        throw new Error('network error');
      }),
    ).rejects.toThrow('network error');

    expect(chunks[chunks.length - 1]).toBe('\r\x1b[2K');
  });

  it('writes nothing when output stream is not a TTY', async () => {
    const { stream, chunks } = createFakeStream(false);
    const spinner = new TerminalSpinner(stream, 10);

    const result = await spinner.run('Syncing...', async () => 42);

    expect(result).toBe(42);
    expect(chunks).toEqual([]);
  });
});
