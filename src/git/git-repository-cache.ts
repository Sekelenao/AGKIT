import { access, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type SimpleGit, simpleGit } from 'simple-git';
import type { AgkitPaths } from '../config/agkit-paths.js';
import type { ProgressReporter } from '../ui/progress-reporter.js';
import { SilentProgressReporter } from '../ui/silent-progress-reporter.js';
import { GitCommandError } from './git-command-error.js';

export class GitRepositoryCache {
  private readonly paths: AgkitPaths;
  private readonly progress: ProgressReporter;

  constructor(
    paths: AgkitPaths,
    progress: ProgressReporter = new SilentProgressReporter(),
  ) {
    this.paths = paths;
    this.progress = progress;
  }

  async sync(repoUrl: string, ref?: string): Promise<string> {
    const repoDir = this.paths.repoCacheDir;
    const isReusable = await this.isMatchingClone(repoDir, repoUrl);
    const statusMessage = isReusable
      ? 'Syncing template repository...'
      : 'Cloning template repository...';

    return this.progress.run(statusMessage, async () => {
      if (!isReusable) {
        await rm(repoDir, { recursive: true, force: true });
        await mkdir(dirname(repoDir), { recursive: true });
        await this.runOperation('clone', () =>
          this.createGit().clone(repoUrl, repoDir),
        );
      } else {
        const git = this.createGit(repoDir);
        await this.runOperation('fetch', () =>
          git.fetch('origin', ['--tags', '--prune']),
        );
      }

      await this.checkoutRef(this.createGit(repoDir), ref);
      return repoDir;
    });
  }

  private createGit(baseDir?: string): SimpleGit {
    const options =
      baseDir === undefined
        ? { allowEnvironment: ['GIT_TERMINAL_PROMPT'] }
        : { baseDir, allowEnvironment: ['GIT_TERMINAL_PROMPT'] };
    return simpleGit(options).env('GIT_TERMINAL_PROMPT', '0');
  }

  private async isMatchingClone(repoDir: string, repoUrl: string): Promise<boolean> {
    try {
      await access(join(repoDir, '.git'));
      const remotes = await this.createGit(repoDir).getRemotes(true);
      const origin = remotes.find((remote) => remote.name === 'origin');
      return origin?.refs.fetch === repoUrl;
    } catch {
      return false;
    }
  }

  private async checkoutRef(git: SimpleGit, ref?: string): Promise<void> {
    if (ref !== undefined) {
      const commitSha = await this.resolveRef(git, ref);
      await this.runOperation('checkout', () =>
        git.checkout(['--detach', commitSha]),
      );
      return;
    }

    const originHead = await this.resolveOriginHead(git);
    if (originHead === undefined) {
      return;
    }

    await this.runOperation('checkout', () =>
      git.checkout(['--detach', originHead]),
    );
  }

  private async resolveRef(git: SimpleGit, ref: string): Promise<string> {
    const candidates = [
      `refs/remotes/origin/${ref}`,
      `refs/tags/${ref}`,
      `${ref}^{commit}`,
    ];

    for (const candidate of candidates) {
      try {
        const sha = (await git.revparse(['--verify', candidate])).trim();
        if (sha.length > 0) {
          return sha;
        }
      } catch {
        // Try next candidate
      }
    }

    throw new GitCommandError(
      'checkout',
      `Branch or tag "${ref}" was not found in repository.`,
    );
  }

  private async resolveOriginHead(git: SimpleGit): Promise<string | undefined> {
    try {
      const ref = (
        await git.raw(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'])
      ).trim();
      return ref.length > 0 ? ref : undefined;
    } catch {
      return undefined;
    }
  }

  private async runOperation<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error: unknown) {
      const rawDetail = error instanceof Error ? error.message : String(error);
      const isAuthFailure =
        rawDetail.includes('terminal prompts disabled') ||
        rawDetail.includes('Authentication failed') ||
        rawDetail.includes('could not read Username');
      const hint = isAuthFailure
        ? ' Use an SSH URL (e.g. git@github.com:org/repo.git) or configure Git credentials.'
        : '';
      throw new GitCommandError(operation, `${rawDetail.trim()}${hint}`, {
        cause: error,
      });
    }
  }
}
