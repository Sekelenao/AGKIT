import { describe, expect, it } from 'vitest';
import { BannerRenderer } from '../../src/ui/banner-renderer.js';
import type { TerminalOutputStream } from '../../src/ui/terminal-spinner.js';

describe('BannerRenderer', () => {
  it('formats the ASCII logo outside an aligned version box', () => {
    const renderer = new BannerRenderer('0.1.0');
    const output = renderer.format(false);
    const lines = output.split('\n');
    const boxLines = lines.slice(-3);

    expect(output).toContain('v0.1.0');
    expect(output).not.toContain('\x1b[');
    expect(lines[0]).not.toContain('│');

    const boxWidth = boxLines[0]?.length ?? 0;
    expect(boxWidth).toBeGreaterThan(0);
    for (const line of boxLines) {
      expect(line.length).toBe(boxWidth);
    }
  });

  it('writes white logo and dim version box to TTY stream when render() is called', () => {
    const chunks: string[] = [];
    const stream: TerminalOutputStream = {
      isTTY: true,
      write(chunk: string): boolean {
        chunks.push(chunk);
        return true;
      },
    };

    const renderer = new BannerRenderer('1.2.3', stream);
    renderer.render();

    const written = chunks.join('');
    expect(written).toContain('v1.2.3');
    expect(written).toContain('\x1b[97m');
  });
});
