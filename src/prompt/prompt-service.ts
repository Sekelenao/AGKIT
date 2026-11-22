import type { ConflictResolution } from '../command/sync/sync-command.js';

export interface PromptChoice {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface DocumentViewOptions {
  readonly title: string;
  readonly subtitle?: string;
  readonly lines: readonly string[];
}

export interface PromptService {
  selectAction(choices: readonly PromptChoice[]): Promise<string>;
  selectHarness(choices: readonly PromptChoice[]): Promise<string>;
  selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]>;
  resolveConflict(filePath: string): Promise<ConflictResolution>;
  inputRepoUrl(currentUrl?: string): Promise<string>;
  inputDefaultRef(currentRef?: string): Promise<string | undefined>;
  viewDocument(options: DocumentViewOptions): Promise<void>;
}
