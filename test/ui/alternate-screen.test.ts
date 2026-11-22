import { describe, expect, it } from 'vitest';
import { AlternateScreen } from '../../src/ui/alternate-screen.js';
import type { TerminalOutputStream } from '../../src/ui/terminal-spinner.js';

function createFakeStream(
  isTTY: boolean,
  rows?: number,
): {
  readonly stream: TerminalOutputStream;
  readonly chunks: string[];
} {
  const chunks: string[] = [];
  return {
    chunks,
    stream: {
      isTTY,
      rows,
      write(chunk: string): boolean {
        chunks.push(chunk);
        return true;
      },
    },
  };
}

describe('AlternateScreen', () => {
  it('enters and exits the alternate screen buffer in a TTY', async () => {
    const { stream, chunks } = createFakeStream(true);
    const screen = new AlternateScreen(stream);

    const result = await screen.run(async () => 'ok');

    expect(result).toBe('ok');
    expect(chunks).toEqual(['\x1b[?1049h\x1b[2J\x1b[H', '\x1b[?1049l']);
  });

  it('restores the previous terminal buffer when the task throws in a TTY', async () => {
    const { stream, chunks } = createFakeStream(true);
    const screen = new AlternateScreen(stream);

    await expect(
      screen.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(chunks).toEqual(['\x1b[?1049h\x1b[2J\x1b[H', '\x1b[?1049l']);
  });

  it('does not emit escape sequences when stream is not a TTY', async () => {
    const { stream, chunks } = createFakeStream(false);
    const screen = new AlternateScreen(stream);

    const result = await screen.run(async () => 123);

    expect(result).toBe(123);
    expect(chunks).toEqual([]);
  });

  it('clears the screen only in a TTY and writes formatted lines', () => {
    const tty = createFakeStream(true);
    const ttyScreen = new AlternateScreen(tty.stream);
    ttyScreen.clear();
    ttyScreen.writeLines(['Line 1', 'Line 2']);
    ttyScreen.writeLines([]);

    expect(tty.chunks).toEqual(['\x1b[2J\x1b[H', 'Line 1\nLine 2\n\n']);

    const nonTty = createFakeStream(false);
    const nonTtyScreen = new AlternateScreen(nonTty.stream);
    nonTtyScreen.clear();
    expect(nonTty.chunks).toEqual([]);
  });

  it('reports terminal rows only in a TTY', () => {
    expect(new AlternateScreen(createFakeStream(true, 24).stream).getRows()).toBe(24);
    expect(new AlternateScreen(createFakeStream(false, 24).stream).getRows()).toBeUndefined();
  });
});
