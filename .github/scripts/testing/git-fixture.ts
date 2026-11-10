import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPTS_DIR = join(import.meta.dirname, '..');

export interface ScriptResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ScriptRun {
  script: string;
  env: Record<string, string>;
  args?: string[];
  cwd?: string;
}

export function runScript({
  script,
  env,
  args = [],
  cwd,
}: ScriptRun): ScriptResult {
  const result = spawnSync('bash', [join(SCRIPTS_DIR, script), ...args], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', ...env },
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'numo-git-fixture-'));
}

/** A throwaway Git repository on `main` with one initial commit. */
export class GitFixture {
  readonly path = createTempDir();
  private originPath: string | undefined;

  constructor() {
    this.git('init', '--quiet', '--initial-branch=main');
    this.git('config', 'user.name', 'Fixture');
    this.git('config', 'user.email', 'fixture@example.com');
    this.git('config', 'commit.gpgsign', 'false');
    this.commit('#1: Initial commit');
  }

  commit(message: string): string {
    this.git('commit', '--quiet', '--allow-empty', '-m', message);
    return this.headSha();
  }

  /** Commits with a fixed committer date, e.g. `2026-11-10T18:45:30Z`. */
  commitAt(message: string, committerDate: string): string {
    execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', message], {
      cwd: this.path,
      env: { ...process.env, GIT_COMMITTER_DATE: committerDate },
    });
    return this.headSha();
  }

  /** Adds a local bare repository as `origin` and pushes `main` to it. */
  addBareOrigin(): void {
    this.originPath = createTempDir();
    execFileSync('git', ['init', '--quiet', '--bare', this.originPath]);
    this.git('remote', 'add', 'origin', this.originPath);
    this.git('push', '--quiet', 'origin', 'main');
  }

  tagOnOrigin(name: string): void {
    this.git('tag', name);
    this.git('push', '--quiet', 'origin', `refs/tags/${name}`);
  }

  /** Lists `origin`'s tags as `<sha> refs/tags/<name>` lines. */
  originTags(): string[] {
    return this.git('ls-remote', '--tags', 'origin')
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.replace('\t', ' '));
  }

  createBranch(name: string): void {
    this.git('switch', '--quiet', '-c', name);
  }

  switchTo(name: string): void {
    this.git('switch', '--quiet', name);
  }

  mergeWithCommit(branch: string): string {
    this.git('merge', '--quiet', '--no-ff', '-m', `Merge ${branch}`, branch);
    return this.headSha();
  }

  headSha(): string {
    return this.git('rev-parse', 'HEAD').trim();
  }

  remove(): void {
    for (const dir of [this.path, this.originPath]) {
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  }

  private git(...args: string[]): string {
    return execFileSync('git', args, { cwd: this.path, encoding: 'utf8' });
  }
}
