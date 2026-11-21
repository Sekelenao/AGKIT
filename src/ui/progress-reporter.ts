export interface ProgressReporter {
  run<T>(message: string, task: () => Promise<T>): Promise<T>;
}
