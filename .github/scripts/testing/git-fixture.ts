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
  cwd?: string;
}

export function runScript({ script, env, cwd }: ScriptRun): ScriptResult {
  const result = spawnSync('bash', [join(SCRIPTS_DIR, script)], {
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

/** A throwaway Git repository on `main` with one initial commit. */
export class GitFixture {
  readonly path = mkdtempSync(join(tmpdir(), 'numo-git-fixture-'));

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
    rmSync(this.path, { recursive: true, force: true });
  }

  private git(...args: string[]): string {
    return execFileSync('git', args, { cwd: this.path, encoding: 'utf8' });
  }
}
