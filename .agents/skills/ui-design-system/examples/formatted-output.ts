import { OutputFormatter } from '../../../../src/ui/output-formatter.js';
import { UiTheme } from '../../../../src/ui/ui-theme.js';

export function renderExampleSummary(isTty: boolean): readonly string[] {
  const formatter = new OutputFormatter(isTty);
  return formatter.formatInitSummary({
    resolvedModuleIds: ['base', 'typescript'],
    writtenFiles: ['AGENTS.md', '.agents/skills/testing/SKILL.md', '.agkit.json'],
  });
}

export function renderExampleStatus(isTty: boolean, message: string): string {
  const theme = new UiTheme(isTty);
  return `${theme.success('◇')}  ${theme.bright(message)}`;
}
