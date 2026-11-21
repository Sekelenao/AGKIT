export interface RootInstructionsHandler {
  relativePath(): string;
  write(targetDir: string, content: string): Promise<string>;
}
