import type { ConflictResolution, SyncConflict } from '../command/sync/sync-command.js';

export interface PromptChoice {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface PromptService {
  selectAction(choices: readonly PromptChoice[]): Promise<string>;
  selectHarness(choices: readonly PromptChoice[]): Promise<string>;
  selectModules(choices: readonly PromptChoice[]): Promise<readonly string[]>;
  resolveConflict(conflict: SyncConflict): Promise<ConflictResolution>;
  inputRepoUrl(currentUrl?: string): Promise<string>;
  inputDefaultRef(currentRef?: string): Promise<string | undefined>;
}
