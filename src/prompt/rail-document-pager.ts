import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useEffect,
  useKeypress,
  useRef,
  useState,
} from '@inquirer/core';
import { DocumentViewport } from '../ui/document-viewport.js';
import { THEME_SYMBOLS, UiTheme } from '../ui/ui-theme.js';

export interface RailDocumentPagerConfig {
  readonly title: string;
  readonly subtitle?: string;
  readonly lines: readonly string[];
  readonly pageSize?: number;
  readonly hint?: string;
}

const CURSOR_HIDE = '\x1b[?25l';
const DEFAULT_CHROME_ROWS = 11;
const MIN_PAGE_SIZE = 5;
const DEFAULT_RULE_WIDTH = 62;
const DEFAULT_HINT = '↑↓ / j k scroll  ·  pgup/pgdn page  ·  g/G top/bottom  ·  q / esc back';
const theme = new UiTheme(true);

function computePageSize(terminalRows: number | undefined): number {
  const rows = terminalRows ?? 24;
  return Math.max(MIN_PAGE_SIZE, rows - DEFAULT_CHROME_ROWS);
}

function computeRuleWidth(terminalColumns: number | undefined): number {
  if (terminalColumns === undefined || terminalColumns < 20) {
    return DEFAULT_RULE_WIDTH;
  }
  return Math.min(DEFAULT_RULE_WIDTH, terminalColumns - 2);
}

export const railDocumentPager = createPrompt(
  (config: RailDocumentPagerConfig, done: (value: undefined) => void): string => {
    const initialPageSize = config.pageSize ?? computePageSize(process.stdout.rows);
    const viewportRef = useRef<DocumentViewport | undefined>(undefined);
    if (viewportRef.current === undefined) {
      viewportRef.current = new DocumentViewport(config.lines, initialPageSize);
    }

    const [status, setStatus] = useState<'idle' | 'done'>('idle');
    const [, setRenderTick] = useState<number>(0);

    const rerender = (): void => {
      setRenderTick((tick) => tick + 1);
    };

    useEffect(() => {
      if (config.pageSize !== undefined || !process.stdout.isTTY) {
        return;
      }

      const handleResize = (): void => {
        viewportRef.current?.setPageSize(computePageSize(process.stdout.rows));
        rerender();
      };

      process.stdout.on('resize', handleResize);
      return (): void => {
        process.stdout.off('resize', handleResize);
      };
    }, []);

    useKeypress((key) => {
      if (status !== 'idle') {
        return;
      }

      const viewport = viewportRef.current;
      if (viewport === undefined) {
        return;
      }

      if (key.name === 'q' || key.name === 'escape' || isEnterKey(key)) {
        setStatus('done');
        done(undefined);
        return;
      }

      if (isUpKey(key) || key.name === 'k') {
        viewport.scrollBy(-1);
        rerender();
      } else if (isDownKey(key) || key.name === 'j') {
        viewport.scrollBy(1);
        rerender();
      } else if (key.name === 'pageup' || key.name === 'b' || key.name === 'u') {
        viewport.scrollPageUp();
        rerender();
      } else if (key.name === 'pagedown' || isSpaceKey(key) || key.name === 'd') {
        viewport.scrollPageDown();
        rerender();
      } else if (key.name === 'home' || (key.name === 'g' && !key.shift)) {
        viewport.scrollToTop();
        rerender();
      } else if (key.name === 'end' || (key.name === 'g' && key.shift)) {
        viewport.scrollToBottom();
        rerender();
      }
    });

    if (status === 'done') {
      return '';
    }

    const snapshot = viewportRef.current.getSnapshot();
    const rule = theme.rule(computeRuleWidth(process.stdout.columns));

    const subtitleSegment =
      config.subtitle === undefined ? '' : `  ${theme.muted(config.subtitle)}`;
    const positionLabel =
      snapshot.totalLines === 0
        ? 'empty'
        : `lines ${snapshot.startLine}–${snapshot.endLine} / ${snapshot.totalLines} · ${snapshot.progressPercent}%`;
    const headerLine = `${theme.accent(THEME_SYMBOLS.active)}  ${theme.brightBold(config.title)}${subtitleSegment}  ${theme.dim(`(${positionLabel})`)}`;

    const bodyLines: string[] =
      snapshot.totalLines === 0
        ? [theme.muted('  (empty document)')]
        : [...snapshot.visibleLines];

    if (snapshot.totalLines > snapshot.pageSize) {
      while (bodyLines.length < snapshot.pageSize) {
        bodyLines.push('');
      }
    }

    const helpLine = `   ${theme.dim(config.hint ?? DEFAULT_HINT)}`;

    const lines = [
      headerLine,
      rule,
      ...bodyLines,
      rule,
      helpLine,
    ];

    return `${lines.join('\n')}${CURSOR_HIDE}`;
  },
);
