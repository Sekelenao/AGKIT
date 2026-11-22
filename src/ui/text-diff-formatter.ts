import { THEME_SYMBOLS, UiTheme } from './ui-theme.js';

type DiffOp =
  | { readonly kind: 'equal'; readonly text: string }
  | { readonly kind: 'remove'; readonly text: string }
  | { readonly kind: 'add'; readonly text: string };

const MAX_LCS_CELLS = 250_000;

export class TextDiffFormatter {
  private readonly theme: UiTheme;
  private readonly maxLines: number;
  private readonly contextLines: number;

  constructor(useColor = false, maxLines = 24, contextLines = 2) {
    this.theme = new UiTheme(useColor);
    this.maxLines = Math.max(1, maxLines);
    this.contextLines = Math.max(0, contextLines);
  }

  format(localContent: string, upstreamContent: string | undefined): readonly string[] {
    const localLines = this.splitLines(localContent);

    if (upstreamContent === undefined) {
      const header = this.theme.dim(`${THEME_SYMBOLS.rule} upstream deleted this file`);
      const body = localLines.map((line) =>
        this.theme.error(`${THEME_SYMBOLS.deleted} ${line}`),
      );
      return [header, ...this.truncateBody(body)];
    }

    const upstreamLines = this.splitLines(upstreamContent);
    const ops = this.computeOps(localLines, upstreamLines);
    const header = this.theme.dim(`${THEME_SYMBOLS.rule} local → upstream`);
    const body = this.renderHunks(ops);

    return [header, ...this.truncateBody(body)];
  }

  private splitLines(content: string): readonly string[] {
    if (content.length === 0) {
      return [];
    }
    const normalized = content.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines;
  }

  private computeOps(
    localLines: readonly string[],
    upstreamLines: readonly string[],
  ): readonly DiffOp[] {
    let prefix = 0;
    while (
      prefix < localLines.length &&
      prefix < upstreamLines.length &&
      localLines[prefix] === upstreamLines[prefix]
    ) {
      prefix += 1;
    }

    let suffix = 0;
    while (
      suffix < localLines.length - prefix &&
      suffix < upstreamLines.length - prefix &&
      localLines[localLines.length - 1 - suffix] ===
        upstreamLines[upstreamLines.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    const ops: DiffOp[] = [];
    for (let i = 0; i < prefix; i += 1) {
      ops.push({ kind: 'equal', text: localLines[i] ?? '' });
    }

    const midLocal = localLines.slice(prefix, localLines.length - suffix);
    const midUpstream = upstreamLines.slice(prefix, upstreamLines.length - suffix);

    if (midLocal.length * midUpstream.length <= MAX_LCS_CELLS) {
      ops.push(...this.computeLcsOps(midLocal, midUpstream));
    } else {
      for (const line of midLocal) {
        ops.push({ kind: 'remove', text: line });
      }
      for (const line of midUpstream) {
        ops.push({ kind: 'add', text: line });
      }
    }

    for (let i = localLines.length - suffix; i < localLines.length; i += 1) {
      ops.push({ kind: 'equal', text: localLines[i] ?? '' });
    }

    return ops;
  }

  private computeLcsOps(
    a: readonly string[],
    b: readonly string[],
  ): readonly DiffOp[] {
    const m = a.length;
    const n = b.length;
    const cols = n + 1;
    const dp = new Uint32Array((m + 1) * cols);

    for (let i = m - 1; i >= 0; i -= 1) {
      for (let j = n - 1; j >= 0; j -= 1) {
        if (a[i] === b[j]) {
          dp[i * cols + j] = (dp[(i + 1) * cols + (j + 1)] ?? 0) + 1;
        } else {
          const down = dp[(i + 1) * cols + j] ?? 0;
          const right = dp[i * cols + (j + 1)] ?? 0;
          dp[i * cols + j] = down >= right ? down : right;
        }
      }
    }

    const ops: DiffOp[] = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
      if (a[i] === b[j]) {
        ops.push({ kind: 'equal', text: a[i] ?? '' });
        i += 1;
        j += 1;
      } else if ((dp[(i + 1) * cols + j] ?? 0) >= (dp[i * cols + (j + 1)] ?? 0)) {
        ops.push({ kind: 'remove', text: a[i] ?? '' });
        i += 1;
      } else {
        ops.push({ kind: 'add', text: b[j] ?? '' });
        j += 1;
      }
    }
    while (i < m) {
      ops.push({ kind: 'remove', text: a[i] ?? '' });
      i += 1;
    }
    while (j < n) {
      ops.push({ kind: 'add', text: b[j] ?? '' });
      j += 1;
    }

    return ops;
  }

  private renderHunks(ops: readonly DiffOp[]): readonly string[] {
    const keep = new Array<boolean>(ops.length).fill(false);
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i]?.kind !== 'equal') {
        const start = Math.max(0, i - this.contextLines);
        const end = Math.min(ops.length - 1, i + this.contextLines);
        for (let k = start; k <= end; k += 1) {
          keep[k] = true;
        }
      }
    }

    const rendered: string[] = [];
    let pendingGap = false;

    for (let i = 0; i < ops.length; i += 1) {
      if (!keep[i]) {
        if (rendered.length > 0) {
          pendingGap = true;
        }
        continue;
      }

      if (pendingGap) {
        rendered.push(this.theme.dim('···'));
        pendingGap = false;
      }
      const op = ops[i];
      if (op === undefined) {
        continue;
      }

      if (op.kind === 'remove') {
        rendered.push(this.theme.error(`${THEME_SYMBOLS.deleted} ${op.text}`));
      } else if (op.kind === 'add') {
        rendered.push(this.theme.success(`${THEME_SYMBOLS.created} ${op.text}`));
      } else {
        rendered.push(this.theme.muted(`  ${op.text}`));
      }
    }

    return rendered;
  }

  private truncateBody(lines: readonly string[]): readonly string[] {
    if (lines.length <= this.maxLines) {
      return lines;
    }
    const omitted = lines.length - this.maxLines;
    const noun = omitted === 1 ? 'line' : 'lines';
    return [
      ...lines.slice(0, this.maxLines),
      this.theme.dim(`… (${omitted} more diff ${noun} omitted)`),
    ];
  }
}
