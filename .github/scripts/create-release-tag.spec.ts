import { GitFixture, runScript } from './testing/git-fixture.js';

const SCRIPT = 'create-release-tag.sh';

function createReleaseTag(repo: GitFixture, version: string, sha: string) {
  return runScript({
    script: SCRIPT,
    cwd: repo.path,
    env: {},
    args: [version, sha],
  });
}

describe('create-release-tag.sh', () => {
  let repo: GitFixture;

  beforeEach(() => {
    repo = new GitFixture();
    repo.addBareOrigin();
  });

  afterEach(() => {
    repo.remove();
  });

  it('should tag the commit on origin with its version and UTC build time', () => {
    // Arrange
    const sha = repo.commitAt('#13: Release 0.1.0', '2026-11-10T18:45:30Z');

    // Act
    const result = createReleaseTag(repo, '0.1.0', sha);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(repo.originTags()).toEqual([
      `${sha} refs/tags/tag_v-0.1.0.202611101845`,
    ]);
  });

  it('should convert a non-UTC committer date to UTC', () => {
    // Arrange
    const sha = repo.commitAt(
      '#13: Release 0.1.0',
      '2026-11-10T21:30:00-03:00',
    );

    // Act
    createReleaseTag(repo, '0.1.0', sha);

    // Assert
    expect(repo.originTags()).toEqual([
      `${sha} refs/tags/tag_v-0.1.0.202611110030`,
    ]);
  });

  it('should skip without failing when the tag already exists', () => {
    // Arrange
    const sha = repo.commitAt('#13: Release 0.1.0', '2026-11-10T18:45:30Z');
    createReleaseTag(repo, '0.1.0', sha);

    // Act
    const result = createReleaseTag(repo, '0.1.0', sha);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('already exists on origin, skipping');
    expect(repo.originTags()).toHaveLength(1);
  });

  it('should fail with a usage error when the commit is missing', () => {
    // Act
    const result = runScript({
      script: SCRIPT,
      cwd: repo.path,
      env: {},
      args: ['0.1.0'],
    });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
