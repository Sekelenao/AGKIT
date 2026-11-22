import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePagination,
  useState,
} from '@inquirer/core';
import { THEME_SYMBOLS, UiTheme } from '../ui/ui-theme.js';

export interface RailCheckboxChoice<Value> {
  readonly value: Value;
  readonly label: string;
  readonly description?: string;
}

export interface RailCheckboxConfig<Value> {
  readonly message: string;
  readonly choices: readonly RailCheckboxChoice<Value>[];
  readonly required?: boolean;
  readonly pageSize?: number;
}

const CURSOR_HIDE = '\x1b[?25l';
const theme = new UiTheme(true);

export const railCheckbox = createPrompt(
  <Value,>(
    config: RailCheckboxConfig<Value>,
    done: (values: readonly Value[]) => void,
  ): string => {
    const { message, choices, required = false, pageSize = 7 } = config;
    const [status, setStatus] = useState<'idle' | 'done'>('idle');
    const [active, setActive] = useState<number>(0);
    const [selectedIndices, setSelectedIndices] = useState<readonly number[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

    const rail = theme.dim(THEME_SYMBOLS.rail);
    const selectedSet = new Set(selectedIndices);
    const activeChoice = choices[active] ?? choices[0];

    useKeypress((key) => {
      if (status !== 'idle' || choices.length === 0) {
        return;
      }

      if (isEnterKey(key)) {
        const picked = choices.filter((_, index) => selectedSet.has(index));
        if (required && picked.length === 0) {
          setErrorMessage('Select at least one option.');
          return;
        }
        setStatus('done');
        done(picked.map((choice) => choice.value));
        return;
      }

      if (isUpKey(key)) {
        setErrorMessage(undefined);
        setActive((active - 1 + choices.length) % choices.length);
      } else if (isDownKey(key)) {
        setErrorMessage(undefined);
        setActive((active + 1) % choices.length);
      } else if (isSpaceKey(key)) {
        setErrorMessage(undefined);
        const next = new Set(selectedIndices);
        if (next.has(active)) {
          next.delete(active);
        } else {
          next.add(active);
        }
        setSelectedIndices([...next]);
      } else if (key.name === 'a') {
        setErrorMessage(undefined);
        if (selectedIndices.length === choices.length) {
          setSelectedIndices([]);
        } else {
          setSelectedIndices(choices.map((_, index) => index));
        }
      }
    });

    if (status === 'done') {
      const pickedLabels = choices
        .filter((_, index) => selectedSet.has(index))
        .map((choice) => choice.label)
        .join(', ');
      return `${theme.success(THEME_SYMBOLS.done)}  ${theme.muted(message)}  ${theme.accent(pickedLabels)}`;
    }

    const page = usePagination({
      items: choices,
      active,
      pageSize,
      loop: true,
      renderItem({ item, isActive, index }) {
        const isChecked = selectedSet.has(index);
        const cursor = isActive ? theme.accentBold(THEME_SYMBOLS.cursor) : ' ';
        const box = isChecked
          ? theme.accent(THEME_SYMBOLS.checked)
          : theme.dim(THEME_SYMBOLS.unchecked);
        const label = isActive
          ? theme.bright(item.label)
          : isChecked
            ? theme.secondary(item.label)
            : theme.muted(item.label);
        return `${rail}  ${cursor} ${box} ${label}`;
      },
    });

    const footerLine =
      errorMessage !== undefined
        ? `${theme.error(THEME_SYMBOLS.end)}  ${theme.error(errorMessage)}`
        : activeChoice?.description !== undefined
          ? `${theme.dim(THEME_SYMBOLS.end)}  ${theme.muted(activeChoice.description)}`
          : theme.dim(THEME_SYMBOLS.end);

    const helpLine = `   ${theme.dim('↑↓ navigate  ·  space select  ·  a all  ·  enter confirm')}`;

    const lines = [
      `${theme.accent(THEME_SYMBOLS.active)}  ${theme.brightBold(message)}`,
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
