export interface PromptChoice {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface PromptService {
  selectAction(choices: readonly PromptChoice[]): Promise<string>;
  selectHarness(choices: readonly PromptChoice[]): Promise<string>;
}
