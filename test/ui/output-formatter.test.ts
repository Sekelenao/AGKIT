import { describe, expect, it } from 'vitest';
import { OutputFormatter } from '../../src/ui/output-formatter.js';

describe('OutputFormatter', () => {
  it('formats init summaries with diff markers and no ANSI codes when color is disabled', () => {
    const formatter = new OutputFormatter(false);
    const lines = formatter.formatInitSummary({
      resolvedModuleIds: ['base'],
      writtenFiles: ['AGENTS.md', '.agkit.json'],
    });

    expect(lines).toEqual([
      '◇  Initialized 2 managed files',
      '   +  AGENTS.md',
      '   +  .agkit.json',
    ]);
    expect(lines.join('\n')).not.toContain('\x1b[');
  });

  it('formats new template repository summaries with created file markers', () => {
    const formatter = new OutputFormatter(false);
    const lines = formatter.formatNewSummary({
      harnessName: 'opencode',
      writtenFiles: ['README.md', 'modules/example/module.json'],
    });

    expect(lines).toEqual([
      '◇  Created template repository (2 files)',
      '   +  README.md',
      '   +  modules/example/module.json',
    ]);
  });

  it('formats sync summaries for up-to-date and mixed file change states', () => {
    const formatter = new OutputFormatter(false);

    expect(
      formatter.formatSyncSummary({
        createdFiles: [],
        updatedFiles: [],
        deletedFiles: [],
        backedUpFiles: [],
        keptConflictFiles: [],
        unchangedFiles: ['AGENTS.md'],
      }),
    ).toEqual(['◇  Already up to date.']);

    const lines = formatter.formatSyncSummary({
      createdFiles: ['new.md'],
      updatedFiles: ['updated.md'],
      deletedFiles: ['old.md'],
      backedUpFiles: ['AGENTS.md.bak'],
      keptConflictFiles: ['AGENTS.md'],
      unchangedFiles: [],
    });

    expect(lines[0]).toContain('▲  Sync complete');
    expect(lines.join('\n')).toContain('+  new.md');
    expect(lines.join('\n')).toContain('~  updated.md');
    expect(lines.join('\n')).toContain('−  old.md');
    expect(lines.join('\n')).toContain('!  AGENTS.md.bak');
    expect(lines.join('\n')).toContain('!  AGENTS.md');
  });

  it('formats module lists with aligned columns', () => {
    const formatter = new OutputFormatter(false);
    const lines = formatter.formatModuleList([
      {
        id: 'base',
        displayName: 'Base',
        description: 'Core rules',
        rootInstructions: undefined,
        skills: [],
        agents: [],
      },
      {
        id: 'typescript',
        displayName: 'TypeScript',
        description: 'Strict TS standards',
        rootInstructions: undefined,
        skills: [],
        agents: [],
      },
    ]);

    expect(lines[0]).toBe('◆ Available Template Modules  (2)');
    expect(lines[2]).toContain('base        Base        Core rules');
    expect(lines[3]).toContain('typescript  TypeScript  Strict TS standards');
  });

  it('formats errors with the Noir & Emerald error marker when color is enabled', () => {
    const formatter = new OutputFormatter(true);
    const formatted = formatter.formatError('Missing config');

    expect(formatted).toContain('■ ERROR');
    expect(formatted).toContain('Missing config');
    expect(formatted).toContain('\x1b[38;2;239;68;68m');
  });

  it('aligns markdown table columns cleanly in TTY mode', () => {
    const formatter = new OutputFormatter(true);
    const markdown = [
      '| Field | Type | Required |',
      '| --- | --- | --- |',
      '| `display_name` | `string` | Yes |',
      '| `file_regex` | `string` | No |',
    ].join('\n');

    const rendered = formatter.formatMarkdownDocument(markdown);
    // Strip ANSI sequences to assert exact column alignment
    const plainLines = rendered
      .replace(/\x1b\[[0-9;]*m/g, '')
      .split('\n');

    expect(plainLines).toEqual([
      '  Field        │ Type   │ Required',
      '  ─────────────┼────────┼─────────',
      '  display_name │ string │ Yes     ',
      '  file_regex   │ string │ No      ',
    ]);
  });

  it('truncates notice lines while preserving the header and remaining count', () => {
    const formatter = new OutputFormatter(false);
    const lines = [
      '◇  Created template repository (5 files)',
      '   +  file-1',
      '   +  file-2',
      '   +  file-3',
      '   +  file-4',
      '   +  file-5',
    ];

    expect(formatter.truncateNoticeLines(lines, 10)).toEqual(lines);
    expect(formatter.truncateNoticeLines(lines, 4)).toEqual([
      '◇  Created template repository (5 files)',
      '   +  file-1',
      '   +  file-2',
      '   … and 3 more',
    ]);
    expect(formatter.truncateNoticeLines(lines, 1)).toEqual([
      '◇  Created template repository (5 files)',
    ]);
  });
});
