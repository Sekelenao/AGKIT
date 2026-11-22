import { THEME_SYMBOLS, type UiTheme } from '../ui/ui-theme.js';

const DEFAULT_TERMINAL_WIDTH = 80;
const RAIL_PREFIX_WIDTH = 3;
const RIGHT_MARGIN = 1;
const MIN_CONTENT_WIDTH = 10;

export type RailFooterTone = 'muted' | 'error';

export function wrapWords(text: string, maxWidth: number): readonly string[] {
  const safeWidth = Math.max(1, maxWidth);
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length === 0) {
      continue;
    }

    let currentLine = '';
    for (const word of words) {
      if (word.length > safeWidth) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = '';
        }
        for (let offset = 0; offset < word.length; offset += safeWidth) {
          const chunk = word.slice(offset, offset + safeWidth);
          if (chunk.length === safeWidth) {
            lines.push(chunk);
          } else {
            currentLine = chunk;
          }
        }
        continue;
      }

      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= safeWidth) {
        currentLine = `${currentLine} ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export function formatRailFooter(
  theme: UiTheme,
  text: string | undefined,
  tone: RailFooterTone = 'muted',
  terminalWidth: number = process.stdout.columns ?? DEFAULT_TERMINAL_WIDTH,
): readonly string[] {
  const styleRail = (symbol: string): string =>
    tone === 'error' ? theme.error(symbol) : theme.dim(symbol);
  const styleText = (line: string): string =>
    tone === 'error' ? theme.error(line) : theme.muted(line);

  if (text === undefined) {
    return [styleRail(THEME_SYMBOLS.end)];
  }

  const maxWidth = Math.max(
    MIN_CONTENT_WIDTH,
    terminalWidth - RAIL_PREFIX_WIDTH - RIGHT_MARGIN,
  );
  const wrapped = wrapWords(text, maxWidth);

  if (wrapped.length === 0) {
    return [styleRail(THEME_SYMBOLS.end)];
  }

  return wrapped.map((line, index) => {
    const symbol =
      index === wrapped.length - 1 ? THEME_SYMBOLS.end : THEME_SYMBOLS.rail;
    return `${styleRail(symbol)}  ${styleText(line)}`;
  });
}
