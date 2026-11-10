import { GitFixture, runScript } from './testing/git-fixture.js';

const SCRIPT = 'validate-commit-count.sh';

interface PullRequest {
  baseRef: string;
  headRef: string;
  commitCount: number;
}

function openPullRequest(
  repo: GitFixture,
  { baseRef, headRef, commitCount }: PullRequest,
) {
  const baseSha = repo.headSha();
  repo.createBranch(headRef);
  for (let index = 1; index <= commitCount; index++) {
    repo.commit(`#11: Change ${index}`);
  }
  return runScript({
    script: SCRIPT,
    cwd: repo.path,
    env: {
      BASE_REF: baseRef,
      HEAD_REF: headRef,
      BASE_SHA: baseSha,
      HEAD_SHA: repo.headSha(),
    },
  });
}

describe('validate-commit-count.sh', () => {
  let repo: GitFixture;

  beforeEach(() => {
    repo = new GitFixture();
  });

  afterEach(() => {
    repo.remove();
  });

  it('should accept a pull request with one commit', () => {
    // Act
    const result = openPullRequest(repo, {
      baseRef: 'develop',
      headRef: 'feature/11-some-change',
      commitCount: 1,
    });

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should reject a pull request with two commits', () => {
    // Act
    const result = openPullRequest(repo, {
      baseRef: 'develop',
      headRef: 'feature/11-some-change',
      commitCount: 2,
    });

    // Assert
    expect(result.exitCode).toBe(1);
  });

  it('should show the squash command when rejecting', () => {
    // Act
    const result = openPullRequest(repo, {
      baseRef: 'develop',
      headRef: 'feature/11-some-change',
      commitCount: 2,
    });

    // Assert
    expect(result.stderr).toContain(
      'git reset --soft $(git merge-base origin/develop HEAD)',
    );
  });

  it('should accept several commits from release/* into main', () => {
    // Act
    const result = openPullRequest(repo, {
      baseRef: 'main',
      headRef: 'release/0.1.0',
      commitCount: 3,
    });

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should accept several commits from main into develop', () => {
    // Act
    const result = runScript({
      script: SCRIPT,
      cwd: repo.path,
      env: {
        BASE_REF: 'develop',
        HEAD_REF: 'main',
        BASE_SHA: repo.headSha(),
        HEAD_SHA: repo.commit('#13: Release 0.1.0'),
      },
    });

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should reject several commits from release/* into develop', () => {
    // Act
    const result = openPullRequest(repo, {
      baseRef: 'develop',
      headRef: 'release/0.1.0',
      commitCount: 2,
    });

    // Assert
    expect(result.exitCode).toBe(1);
  });

  it('should fail with a usage error when an input is missing', () => {
    // Act
    const result = runScript({
      script: SCRIPT,
      cwd: repo.path,
      env: { BASE_REF: 'develop', HEAD_REF: 'feature/11-some-change' },
    });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
