import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { BannerRenderer } from '../../src/ui/banner-renderer.js';
import type { TerminalOutputStream } from '../../src/ui/terminal-spinner.js';

describe('BannerRenderer', () => {
  it('formats the Compact Split header without ANSI codes when color is disabled', () => {
    const renderer = new BannerRenderer('0.1.0');
    const output = renderer.format(false);
    const lines = output.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('◆ AGKIT  v0.1.0  AI Harness Templates');
    expect(lines[1]).toMatch(/^─+$/);
    expect(output).not.toContain('\x1b[');
  });

  it('includes repository and shortened working directory when context is provided', () => {
    const renderer = new BannerRenderer('0.1.0');
    const output = renderer.format(false, {
      repoUrl: 'git@github.com:org/templates.git',
      ref: 'main',
      cwd: `${homedir()}/projects/demo`,
    });
    const lines = output.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe(
      'repo git@github.com:org/templates.git (main)  ·  dir ~/projects/demo',
    );
  });

  it('writes Noir & Emerald ANSI-styled banner to a TTY stream when render() is called', () => {
    const chunks: string[] = [];
    const stream: TerminalOutputStream = {
      isTTY: true,
      write(chunk: string): boolean {
        chunks.push(chunk);
        return true;
      },
    };

    const renderer = new BannerRenderer('1.2.3', stream);
    renderer.render({ repoUrl: 'https://example.com/repo.git' });

    const written = chunks.join('');
    expect(written).toContain('AGKIT');
    expect(written).toContain('v1.2.3');
    expect(written).toContain('https://example.com/repo.git');
    expect(written).toContain('\x1b[38;2;52;211;153m');
  });
});
