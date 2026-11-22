import { describe, expect, it } from 'vitest';
import { DocumentViewport } from '../../src/ui/document-viewport.js';

describe('DocumentViewport', () => {
  const sampleLines = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`);

  it('slices visible lines and reports initial scroll metadata', () => {
    const viewport = new DocumentViewport(sampleLines, 4);

    expect(viewport.getSnapshot()).toEqual({
      visibleLines: ['Line 1', 'Line 2', 'Line 3', 'Line 4'],
      startLine: 1,
      endLine: 4,
      totalLines: 10,
      offset: 0,
      maxOffset: 6,
      pageSize: 4,
      canScrollUp: false,
      canScrollDown: true,
      progressPercent: 0,
    });
  });

  it('scrolls by line deltas and clamps at top and bottom bounds', () => {
    const viewport = new DocumentViewport(sampleLines, 4);

    viewport.scrollBy(-5);
    expect(viewport.getSnapshot().offset).toBe(0);

    viewport.scrollBy(3);
    expect(viewport.getSnapshot()).toMatchObject({
      visibleLines: ['Line 4', 'Line 5', 'Line 6', 'Line 7'],
      startLine: 4,
      endLine: 7,
      offset: 3,
      canScrollUp: true,
      canScrollDown: true,
      progressPercent: 50,
    });

    viewport.scrollBy(50);
    expect(viewport.getSnapshot()).toMatchObject({
      visibleLines: ['Line 7', 'Line 8', 'Line 9', 'Line 10'],
      startLine: 7,
      endLine: 10,
      offset: 6,
      canScrollUp: true,
      canScrollDown: false,
      progressPercent: 100,
    });
  });

  it('pages down and up with one-line context overlap and jumps to top/bottom', () => {
    const viewport = new DocumentViewport(sampleLines, 4);

    viewport.scrollPageDown();
    expect(viewport.getSnapshot().startLine).toBe(4);

    viewport.scrollPageDown();
    expect(viewport.getSnapshot().startLine).toBe(7);

    viewport.scrollPageUp();
    expect(viewport.getSnapshot().startLine).toBe(4);

    viewport.scrollToBottom();
    expect(viewport.getSnapshot().offset).toBe(6);

    viewport.scrollToTop();
    expect(viewport.getSnapshot().offset).toBe(0);
  });

  it('re-clamps offset when terminal page size grows', () => {
    const viewport = new DocumentViewport(sampleLines, 4);
    viewport.scrollToBottom();
    expect(viewport.getSnapshot().offset).toBe(6);

    viewport.setPageSize(8);
    expect(viewport.getSnapshot()).toMatchObject({
      offset: 2,
      maxOffset: 2,
      startLine: 3,
      endLine: 10,
      progressPercent: 100,
    });
  });

  it('handles empty documents and CRLF text via fromText()', () => {
    const empty = DocumentViewport.fromText('', 5);
    expect(empty.getSnapshot()).toEqual({
      visibleLines: [],
      startLine: 0,
      endLine: 0,
      totalLines: 0,
      offset: 0,
      maxOffset: 0,
      pageSize: 5,
      canScrollUp: false,
      canScrollDown: false,
      progressPercent: 100,
    });

    const fromCrlf = DocumentViewport.fromText('Alpha\r\nBeta\r\nGamma\r\n', 2);
    expect(fromCrlf.getSnapshot().visibleLines).toEqual(['Alpha', 'Beta']);
    expect(fromCrlf.getSnapshot().totalLines).toBe(3);
  });
});
