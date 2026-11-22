import { describe, expect, it } from 'vitest';
import { formatRailFooter, wrapWords } from '../../src/prompt/rail-footer.js';
import { UiTheme } from '../../src/ui/ui-theme.js';

describe('wrapWords', () => {
  it('keeps short text on a single line', () => {
    expect(wrapWords('Short description', 40)).toEqual(['Short description']);
  });

  it('wraps text on word boundaries without splitting words', () => {
    const text =
      'Harness-agnostic best practices for authoring reusable AI skills and specialized agents';
    expect(wrapWords(text, 76)).toEqual([
      'Harness-agnostic best practices for authoring reusable AI skills and',
      'specialized agents',
    ]);
  });

  it('hard-breaks a single token that exceeds maxWidth', () => {
    expect(wrapWords('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('returns an empty array for whitespace-only input', () => {
    expect(wrapWords('   \n  ', 40)).toEqual([]);
  });
});

describe('formatRailFooter', () => {
  const plainTheme = new UiTheme(false);

  it('renders only the rail end symbol when description is absent or blank', () => {
    expect(formatRailFooter(plainTheme, undefined, 'muted', 80)).toEqual(['└']);
    expect(formatRailFooter(plainTheme, '   ', 'muted', 80)).toEqual(['└']);
  });

  it('renders a single-line description with the rail end symbol', () => {
    expect(
      formatRailFooter(plainTheme, 'Java project defaults', 'muted', 80),
    ).toEqual(['└  Java project defaults']);
  });

  it('continues the vertical rail on wrapped lines and terminates with └ on the last line', () => {
    const description =
      'Harness-agnostic best practices for authoring reusable AI skills and specialized agents';
    const lines = formatRailFooter(plainTheme, description, 'muted', 80);

    expect(lines).toEqual([
      '│  Harness-agnostic best practices for authoring reusable AI skills and',
      '└  specialized agents',
    ]);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it('styles error footers with the error palette when color is enabled', () => {
    const colorTheme = new UiTheme(true);
    const lines = formatRailFooter(
      colorTheme,
      'Select at least one option.',
      'error',
      80,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('\x1b[38;2;239;68;68m');
    expect(lines[0]).toContain('Select at least one option.');
  });
});
