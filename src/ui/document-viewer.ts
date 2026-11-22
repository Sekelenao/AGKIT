import type { PromptService } from '../prompt/prompt-service.js';
import { OutputFormatter } from './output-formatter.js';

export type DocumentFormat = 'markdown' | 'plain';

export interface DocumentViewRequest {
  readonly title: string;
  readonly subtitle?: string;
  readonly content: string;
  readonly format?: DocumentFormat;
}

export class DocumentViewer {
  private readonly promptService: PromptService;
  private readonly outputFormatter: OutputFormatter;

  constructor(
    promptService: PromptService,
    outputFormatter: OutputFormatter = new OutputFormatter(false),
  ) {
    this.promptService = promptService;
    this.outputFormatter = outputFormatter;
  }

  async show(request: DocumentViewRequest): Promise<void> {
    const format = request.format ?? 'markdown';
    const rendered =
      format === 'markdown'
        ? this.outputFormatter.formatMarkdownDocument(request.content)
        : request.content;

    const normalized = rendered.replace(/\r\n/g, '\n');
    const trimmed = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
    const lines = trimmed.length === 0 ? [] : trimmed.split('\n');

    await this.promptService.viewDocument({
      title: request.title,
      subtitle: request.subtitle,
      lines,
    });
  }

  async showMarkdown(title: string, markdown: string, subtitle?: string): Promise<void> {
    await this.show({
      title,
      subtitle,
      content: markdown,
      format: 'markdown',
    });
  }

  async showPlain(title: string, text: string, subtitle?: string): Promise<void> {
    await this.show({
      title,
      subtitle,
      content: text,
      format: 'plain',
    });
  }
}
