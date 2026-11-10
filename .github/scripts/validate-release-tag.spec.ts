import { GitFixture, runScript } from './testing/git-fixture.js';

const SCRIPT = 'validate-release-tag.sh';

function validateReleaseTag(repo: GitFixture, version: string) {
  return runScript({
    script: SCRIPT,
    cwd: repo.path,
    env: {},
    args: [version],
  });
}

describe('validate-release-tag.sh', () => {
  let repo: GitFixture;

  beforeEach(() => {
    repo = new GitFixture();
    repo.addBareOrigin();
  });

  afterEach(() => {
    repo.remove();
  });

  it('should accept a version that was never released', () => {
    // Act
    const result = validateReleaseTag(repo, '0.1.0');

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should reject a version that was already released', () => {
    // Arrange
    repo.tagOnOrigin('tag_v-0.1.0.202611101845');

    // Act
    const result = validateReleaseTag(repo, '0.1.0');

    // Assert
    expect(result.exitCode).toBe(1);
  });

  it('should ask to bump the version and name the existing tag', () => {
    // Arrange
    repo.tagOnOrigin('tag_v-0.1.0.202611101845');

    // Act
    const result = validateReleaseTag(repo, '0.1.0');

    // Assert
    expect(result.stderr).toContain('  tag_v-0.1.0.202611101845\n');
    expect(result.stderr).toContain('Bump "version" in package.json');
  });

  it('should accept a new version when only older versions were released', () => {
    // Arrange
    repo.tagOnOrigin('tag_v-0.1.0.202611101845');

    // Act
    const result = validateReleaseTag(repo, '0.1.1');

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it('should fail with a usage error when the version is missing', () => {
    // Act
    const result = runScript({ script: SCRIPT, cwd: repo.path, env: {} });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
