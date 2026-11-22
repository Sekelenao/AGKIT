import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isUpKey,
  useKeypress,
  usePagination,
  useState,
} from '@inquirer/core';
import { THEME_SYMBOLS, UiTheme } from '../ui/ui-theme.js';

export interface RailSelectChoice<Value> {
  readonly value: Value;
  readonly label: string;
  readonly description?: string;
}

export interface RailSelectConfig<Value> {
  readonly message: string;
  readonly choices: readonly RailSelectChoice<Value>[];
  readonly tone?: 'accent' | 'warning';
  readonly pageSize?: number;
}

const CURSOR_HIDE = '\x1b[?25l';
const theme = new UiTheme(true);

export const railSelect = createPrompt(
  <Value,>(config: RailSelectConfig<Value>, done: (value: Value) => void): string => {
    const { message, choices, tone = 'accent', pageSize = 7 } = config;
    const [status, setStatus] = useState<'idle' | 'done'>('idle');
    const [active, setActive] = useState<number>(0);

    const rail = theme.dim(THEME_SYMBOLS.rail);
    const activeChoice = choices[active] ?? choices[0];

    useKeypress((key) => {
      if (status !== 'idle' || choices.length === 0) {
        return;
      }

      if (isEnterKey(key) && activeChoice !== undefined) {
        setStatus('done');
        done(activeChoice.value);
        return;
      }

      if (isUpKey(key)) {
        setActive((active - 1 + choices.length) % choices.length);
      } else if (isDownKey(key)) {
        setActive((active + 1) % choices.length);
      }
    });

    if (status === 'done') {
      const answer = activeChoice === undefined ? '' : activeChoice.label;
      return `${theme.success(THEME_SYMBOLS.done)}  ${theme.muted(message)}  ${theme.accent(answer)}`;
    }

    const headerIcon =
      tone === 'warning'
        ? theme.warning(THEME_SYMBOLS.warning)
        : theme.accent(THEME_SYMBOLS.active);
    const headerTitle =
      tone === 'warning'
        ? theme.warningBold(message)
        : theme.brightBold(message);

    const page = usePagination({
      items: choices,
      active,
      pageSize,
      loop: true,
      renderItem({ item, isActive }) {
        if (isActive) {
          return `${rail}  ${theme.accentBold(THEME_SYMBOLS.cursor)} ${theme.bright(item.label)}`;
        }
        return `${rail}    ${theme.muted(item.label)}`;
      },
    });

    const footerLine =
      activeChoice?.description !== undefined
        ? `${theme.dim(THEME_SYMBOLS.end)}  ${theme.muted(activeChoice.description)}`
        : theme.dim(THEME_SYMBOLS.end);

    const helpLine = `   ${theme.dim('↑↓ navigate  ·  enter confirm  ·  ctrl+c quit')}`;

    const lines = [
      `${headerIcon}  ${headerTitle}`,
      rail,
      page,
      rail,
      footerLine,
      '',
      helpLine,
    ];

    return `${lines.join('\n')}${CURSOR_HIDE}`;
  },
);
