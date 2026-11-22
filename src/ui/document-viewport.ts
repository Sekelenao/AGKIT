export interface DocumentViewportSnapshot {
  readonly visibleLines: readonly string[];
  readonly startLine: number;
  readonly endLine: number;
  readonly totalLines: number;
  readonly offset: number;
  readonly maxOffset: number;
  readonly pageSize: number;
  readonly canScrollUp: boolean;
  readonly canScrollDown: boolean;
  readonly progressPercent: number;
}

export class DocumentViewport {
  private readonly lines: readonly string[];
  private pageSize: number;
  private offset = 0;

  constructor(lines: readonly string[], pageSize: number) {
    this.lines = lines;
    this.pageSize = DocumentViewport.normalizePageSize(pageSize);
  }

  static fromText(text: string, pageSize: number): DocumentViewport {
    const normalized = text.replace(/\r\n/g, '\n');
    const trimmed = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
    const lines = trimmed.length === 0 ? [] : trimmed.split('\n');
    return new DocumentViewport(lines, pageSize);
  }

  scrollBy(delta: number): void {
    this.offset = this.clampOffset(this.offset + delta);
  }

  scrollPageDown(): void {
    this.scrollBy(Math.max(1, this.pageSize - 1));
  }

  scrollPageUp(): void {
    this.scrollBy(-Math.max(1, this.pageSize - 1));
  }

  scrollToTop(): void {
    this.offset = 0;
  }

  scrollToBottom(): void {
    this.offset = this.getMaxOffset();
  }

  setPageSize(pageSize: number): void {
    this.pageSize = DocumentViewport.normalizePageSize(pageSize);
    this.offset = this.clampOffset(this.offset);
  }

  getSnapshot(): DocumentViewportSnapshot {
    const totalLines = this.lines.length;
    const maxOffset = this.getMaxOffset();
    const visibleLines = this.lines.slice(this.offset, this.offset + this.pageSize);
    const startLine = totalLines === 0 ? 0 : this.offset + 1;
    const endLine = totalLines === 0 ? 0 : this.offset + visibleLines.length;
    const progressPercent =
      totalLines === 0 || maxOffset === 0
        ? 100
        : Math.round((this.offset / maxOffset) * 100);

    return {
      visibleLines,
      startLine,
      endLine,
      totalLines,
      offset: this.offset,
      maxOffset,
      pageSize: this.pageSize,
      canScrollUp: this.offset > 0,
      canScrollDown: this.offset < maxOffset,
      progressPercent,
    };
  }

  private getMaxOffset(): number {
    return Math.max(0, this.lines.length - this.pageSize);
  }

  private clampOffset(value: number): number {
    return Math.min(this.getMaxOffset(), Math.max(0, value));
  }

  private static normalizePageSize(pageSize: number): number {
    if (!Number.isFinite(pageSize) || pageSize < 1) {
      return 1;
    }
    return Math.floor(pageSize);
  }
}
