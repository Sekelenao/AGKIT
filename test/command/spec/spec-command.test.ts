import { describe, expect, it } from 'vitest';
import { SpecCommand } from '../../../src/command/spec/spec-command.js';
import { OutputFormatter } from '../../../src/ui/output-formatter.js';

describe('SpecCommand', () => {
  it('reads the template repository specification markdown', async () => {
    const command = new SpecCommand();
    const spec = await command.execute();

    expect(spec).toContain('# Template Repository Specification');
    expect(spec).toContain('module.json');
    expect(spec).toContain('skill.json');
    expect(spec).toContain('agent.json');
    expect(spec).toContain('PROMPT.md');
    expect(spec).toContain('IBM Bob');
  });

  it('returns raw markdown when color is disabled and styled markdown when color is enabled', async () => {
    const command = new SpecCommand();
    const spec = await command.execute();

    const plainFormatter = new OutputFormatter(false);
    expect(plainFormatter.formatMarkdownDocument(spec)).toBe(spec);

    const ttyFormatter = new OutputFormatter(true);
    const styled = ttyFormatter.formatMarkdownDocument(spec);
    expect(styled).toContain('\x1b[38;2;52;211;153m');
    expect(styled).toContain('Template Repository Specification');
  });
});
