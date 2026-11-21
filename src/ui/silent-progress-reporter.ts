import type { ProgressReporter } from './progress-reporter.js';

export class SilentProgressReporter implements ProgressReporter {
  async run<T>(_message: string, task: () => Promise<T>): Promise<T> {
    return task();
  }
}
