import {
  createPrompt,
  isBackspaceKey,
  isEnterKey,
  isTabKey,
  useKeypress,
  useState,
} from '@inquirer/core';
import { THEME_SYMBOLS, UiTheme } from '../ui/ui-theme.js';
import { PROMPT_CANCELLED } from './prompt-cancelled-error.js';

export interface RailInputConfig {
  readonly message: string;
  readonly default?: string;
  readonly validate?: (value: string) => boolean | string | Promise<boolean | string>;
  readonly cancelLabel?: string;
}

const theme = new UiTheme(true);

export const railInput = createPrompt(
  (
    config: RailInputConfig,
    done: (value: string | typeof PROMPT_CANCELLED) => void,
  ): [string, string] => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'cancelled'>('idle');
    const [defaultValue, setDefaultValue] = useState<string>(config.default ?? '');
    const [value, setValue] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

    useKeypress(async (key, rl) => {
      if (status !== 'idle') {
        return;
      }

      if (key.name === 'escape') {
        setStatus('cancelled');
        done(PROMPT_CANCELLED);
        return;
      }

      if (isEnterKey(key)) {
        const answer = value.length > 0 ? value : defaultValue;
        setStatus('loading');
        const validation =
          config.validate === undefined ? true : await config.validate(answer);

        if (validation === true) {
          setValue(answer);
          setStatus('done');
          done(answer);
          return;
        }

        rl.write(value);
        setErrorMessage(
          typeof validation === 'string' ? validation : 'Invalid value.',
        );
        setStatus('idle');
        return;
      }

      if (isBackspaceKey(key) && value.length === 0) {
        setDefaultValue('');
        return;
      }

      if (isTabKey(key) && value.length === 0 && defaultValue.length > 0) {
        setDefaultValue('');
        rl.clearLine(0);
        rl.write(defaultValue);
        setValue(defaultValue);
        return;
      }

      setValue(rl.line);
      setErrorMessage(undefined);
    });

    if (status === 'cancelled') {
      return ['', ''];
    }

    if (status === 'done') {
      const displayAnswer = value.length > 0 ? theme.accent(value) : theme.dim('(default)');
      return [
        `${theme.success(THEME_SYMBOLS.done)}  ${theme.muted(config.message)}  ${displayAnswer}`,
        '',
      ];
    }

    const defaultSegment =
      defaultValue.length > 0 && value.length === 0
        ? ` ${theme.dim(`(${defaultValue})`)}`
        : '';
    const promptLine = `${theme.accent(THEME_SYMBOLS.active)}  ${theme.brightBold(config.message)}${defaultSegment} ${value}`;

    const cancelLabel = config.cancelLabel ?? 'back';
    const bottomParts: string[] = [];
    if (errorMessage !== undefined) {
      bottomParts.push(
        `   ${theme.errorBold(THEME_SYMBOLS.error)} ${theme.error(errorMessage)}`,
      );
    }
    bottomParts.push(
      `   ${theme.dim(`enter confirm  ·  esc ${cancelLabel}`)}`,
    );

    return [promptLine, bottomParts.join('\n')];
  },
);
