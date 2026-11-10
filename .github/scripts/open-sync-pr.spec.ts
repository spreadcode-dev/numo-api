import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GitFixture, runScript } from './testing/git-fixture.js';

const SCRIPT = 'open-sync-pr.sh';
const FAKE_GH_DIR = join(import.meta.dirname, 'testing', 'fake-gh');
const OPEN_SYNC_PR_URL = 'https://github.com/spreadcode-dev/numo-api/pull/42';

describe('open-sync-pr.sh', () => {
  let repo: GitFixture;
  let ghLog: string;

  beforeEach(() => {
    repo = new GitFixture();
    repo.addBareOrigin();
    repo.createBranch('develop');
    repo.pushBranch('develop');
    repo.switchTo('main');
    ghLog = join(repo.path, '.git', 'fake-gh.log');
  });

  afterEach(() => {
    repo.remove();
  });

  function releaseToMain(message: string): void {
    repo.commit(message);
    repo.pushBranch('main');
  }

  function openSyncPr(openPrUrl = '') {
    return runScript({
      script: SCRIPT,
      cwd: repo.path,
      args: ['0.1.0'],
      env: {
        PATH: `${FAKE_GH_DIR}:${process.env.PATH ?? ''}`,
        FAKE_GH_LOG: ghLog,
        FAKE_GH_OPEN_PR_URL: openPrUrl,
      },
    });
  }

  function ghCalls(): string {
    try {
      return readFileSync(ghLog, 'utf8');
    } catch {
      return '';
    }
  }

  it('should open a sync PR from main into develop when develop is behind', () => {
    // Arrange
    releaseToMain('#13: Release 0.1.0');

    // Act
    const result = openSyncPr();

    // Assert
    expect(result.exitCode).toBe(0);
    expect(ghCalls()).toContain(
      'pr|create|--base|develop|--head|main|--title|Sync Release 0.1.0 (main into develop)|--body|',
    );
  });

  it('should list the commits missing from develop', () => {
    // Arrange
    releaseToMain('#13: Release 0.1.0');
    releaseToMain('#15: Hotfix login');

    // Act
    const result = openSyncPr();

    // Assert
    expect(result.stdout).toContain('Commits on main missing from develop:');
    expect(result.stdout).toContain('#13: Release 0.1.0');
    expect(result.stdout).toContain('#15: Hotfix login');
  });

  it('should not call GitHub when develop already has everything from main', () => {
    // Act
    const result = openSyncPr();

    // Assert
    expect(result.exitCode).toBe(0);
    expect(ghCalls()).toBe('');
  });

  it('should not open a second PR when a sync PR is already open', () => {
    // Arrange
    releaseToMain('#13: Release 0.1.0');

    // Act
    const result = openSyncPr(OPEN_SYNC_PR_URL);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      `Sync PR already open: ${OPEN_SYNC_PR_URL}`,
    );
    expect(ghCalls()).not.toContain('pr|create');
  });

  it('should fail with a usage error when the version is missing', () => {
    // Act
    const result = runScript({ script: SCRIPT, cwd: repo.path, env: {} });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
