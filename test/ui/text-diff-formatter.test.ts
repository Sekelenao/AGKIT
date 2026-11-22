import { describe, expect, it } from 'vitest';
import { TextDiffFormatter } from '../../src/ui/text-diff-formatter.js';

describe('TextDiffFormatter', () => {
  it('renders added, removed, and surrounding context lines without ANSI when color is disabled', () => {
    const formatter = new TextDiffFormatter(false, 24, 1);
    const lines = formatter.format(
      'line 1\nline 2\nline 3\nold line\nline 5\nline 6\n',
      'line 1\nline 2\nline 3\nnew line\nline 5\nline 6\n',
    );

    expect(lines).toEqual([
      '─ local → upstream',
      '  line 3',
      '− old line',
      '+ new line',
      '  line 5',
    ]);
    expect(lines.join('\n')).not.toContain('\x1b[');
  });

  it('truncates long diffs to maxLines and appends an omission notice', () => {
    const formatter = new TextDiffFormatter(false, 4, 0);
    const local = ['a', 'b', 'c', 'd', 'e'].join('\n');
    const upstream = ['1', '2', '3', '4', '5'].join('\n');

    const lines = formatter.format(local, upstream);

    expect(lines).toEqual([
      '─ local → upstream',
      '− a',
      '− b',
      '− c',
      '− d',
      '… (6 more diff lines omitted)',
    ]);
  });

  it('renders a deletion preview when upstream removed the file', () => {
    const formatter = new TextDiffFormatter(false, 2, 0);
    const lines = formatter.format('line 1\nline 2\nline 3\n', undefined);

    expect(lines).toEqual([
      '─ upstream deleted this file',
      '− line 1',
      '− line 2',
      '… (1 more diff line omitted)',
    ]);
  });

  it('inserts a hunk separator between distant changes', () => {
    const formatter = new TextDiffFormatter(false, 24, 1);
    const local = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].join('\n');
    const upstream = ['A', 'b', 'c', 'd', 'e', 'f', 'G'].join('\n');

    const lines = formatter.format(local, upstream);

    expect(lines).toEqual([
      '─ local → upstream',
      '− a',
      '+ A',
      '  b',
      '···',
      '  f',
      '− g',
      '+ G',
    ]);
  });
});
