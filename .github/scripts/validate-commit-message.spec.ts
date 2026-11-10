import { GitFixture, runScript } from './testing/git-fixture.js';

const SCRIPT = 'validate-commit-message.sh';

function validateMessages(repo: GitFixture, baseSha: string) {
  return runScript({
    script: SCRIPT,
    cwd: repo.path,
    env: { BASE_SHA: baseSha, HEAD_SHA: repo.headSha() },
  });
}

describe('validate-commit-message.sh', () => {
  let repo: GitFixture;
  let baseSha: string;

  beforeEach(() => {
    repo = new GitFixture();
    baseSha = repo.headSha();
    repo.createBranch('feature/11-some-change');
  });

  afterEach(() => {
    repo.remove();
  });

  it('should accept commits titled "#<issue-number>: <description>"', () => {
    // Arrange
    repo.commit('#11: some change');

    // Act
    const result = validateMessages(repo, baseSha);

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should reject a commit without the issue prefix', () => {
    // Arrange
    repo.commit('fix stuff');

    // Act
    const result = validateMessages(repo, baseSha);

    // Assert
    expect(result.exitCode).toBe(1);
  });

  it('should list only the invalid commit messages', () => {
    // Arrange
    repo.commit('#11: some change');
    repo.commit('fix stuff');

    // Act
    const result = validateMessages(repo, baseSha);

    // Assert
    expect(result.stderr).toContain('  fix stuff\n');
    expect(result.stderr).not.toContain('#11: some change');
  });

  it.each(['#11 some change', '#11:', 'some change #11', '#abc: some change'])(
    'should reject the malformed message "%s"',
    (message) => {
      // Arrange
      repo.commit(message);

      // Act
      const result = validateMessages(repo, baseSha);

      // Assert
      expect(result.exitCode).toBe(1);
    },
  );

  it('should ignore merge commits', () => {
    // Arrange
    repo.commit('#11: some change');
    repo.switchTo('main');
    repo.createBranch('release/0.1.0');
    repo.mergeWithCommit('feature/11-some-change');

    // Act
    const result = validateMessages(repo, baseSha);

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should fail with a usage error when an input is missing', () => {
    // Act
    const result = runScript({
      script: SCRIPT,
      cwd: repo.path,
      env: { BASE_SHA: baseSha },
    });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
