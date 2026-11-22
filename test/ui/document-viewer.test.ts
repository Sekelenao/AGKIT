import { describe, expect, it } from 'vitest';
import type { ConflictResolution } from '../../src/command/sync/sync-command.js';
import type { DocumentViewOptions, PromptService } from '../../src/prompt/prompt-service.js';
import { DocumentViewer } from '../../src/ui/document-viewer.js';
import { OutputFormatter } from '../../src/ui/output-formatter.js';

function createCapturingPromptService(): {
  readonly promptService: PromptService;
  readonly viewedDocuments: DocumentViewOptions[];
} {
  const viewedDocuments: DocumentViewOptions[] = [];

  const promptService: PromptService = {
    async selectAction(): Promise<string> {
      throw new Error('not used');
    },
    async selectHarness(): Promise<string> {
      throw new Error('not used');
    },
    async selectModules(): Promise<readonly string[]> {
      throw new Error('not used');
    },
    async resolveConflict(): Promise<ConflictResolution> {
      throw new Error('not used');
    },
    async inputRepoUrl(): Promise<string> {
      throw new Error('not used');
    },
    async inputDefaultRef(): Promise<string | undefined> {
      throw new Error('not used');
    },
    async viewDocument(options: DocumentViewOptions): Promise<void> {
      viewedDocuments.push(options);
    },
  };

  return { promptService, viewedDocuments };
}

describe('DocumentViewer', () => {
  it('formats markdown documents with OutputFormatter and delegates lines to PromptService', async () => {
    const { promptService, viewedDocuments } = createCapturingPromptService();
    const viewer = new DocumentViewer(promptService, new OutputFormatter(true));

    await viewer.showMarkdown('Spec', '# Heading\n\n- Item `one`\n', 'docs/spec.md');

    expect(viewedDocuments).toHaveLength(1);
    const viewed = viewedDocuments[0];
    expect(viewed?.title).toBe('Spec');
    expect(viewed?.subtitle).toBe('docs/spec.md');
    expect(viewed?.lines).toHaveLength(3);
    expect(viewed?.lines[0]).toContain('Heading');
    expect(viewed?.lines[2]).toContain('Item');
  });

  it('passes plain text documents through without markdown transformation', async () => {
    const { promptService, viewedDocuments } = createCapturingPromptService();
    const viewer = new DocumentViewer(promptService, new OutputFormatter(true));

    await viewer.showPlain('Raw Log', '# Not a heading\r\nLine 2\r\n');

    expect(viewedDocuments).toEqual([
      {
        title: 'Raw Log',
        subtitle: undefined,
        lines: ['# Not a heading', 'Line 2'],
      },
    ]);
  });
});
