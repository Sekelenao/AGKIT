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

  it('formats module lists with aligned columns and extends metadata', () => {
    const formatter = new OutputFormatter(false);
    const lines = formatter.formatModuleList([
      {
        id: 'base',
        displayName: 'Base',
        description: 'Core rules',
        extends: [],
        skills: [],
        agents: [],
      },
      {
        id: 'typescript',
        displayName: 'TypeScript',
        description: 'Strict TS standards',
        extends: ['base'],
        skills: [],
        agents: [],
      },
    ]);

    expect(lines[0]).toBe('◆ Available Template Modules  (2)');
    expect(lines[2]).toContain('base        Base        Core rules');
    expect(lines[3]).toContain('typescript  TypeScript  Strict TS standards [extends: base]');
  });

  it('formats errors with the Noir & Emerald error marker when color is enabled', () => {
    const formatter = new OutputFormatter(true);
    const formatted = formatter.formatError('Missing config');

    expect(formatted).toContain('■ ERROR');
    expect(formatted).toContain('Missing config');
    expect(formatted).toContain('\x1b[38;2;239;68;68m');
  });
});
