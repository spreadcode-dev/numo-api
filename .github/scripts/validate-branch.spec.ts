import { runScript } from './testing/git-fixture.js';

const SCRIPT = 'validate-branch.sh';

function validateBranch(headRef: string) {
  return runScript({ script: SCRIPT, env: { HEAD_REF: headRef } });
}

describe('validate-branch.sh', () => {
  it.each([
    'feature/11-some-change',
    'bugfix/7-fix-health',
    'hotfix/3-urgent',
    'chore/10-ac02-failing-test',
    'claude/review-ci',
    'release/1.2.3',
    'release/0.1.0-rc.1',
    'main',
    'develop',
  ])('should accept %s', (branch) => {
    // Act
    const result = validateBranch(branch);

    // Assert
    expect(result.exitCode).toBe(0);
  });

  it.each([
    'my-branch',
    'feature/12-Create-Account',
    'feat/12-create-account',
    'feature/12_create_account',
    'feature/',
    'release/',
  ])('should reject %s', (branch) => {
    // Act
    const result = validateBranch(branch);

    // Assert
    expect(result.exitCode).toBe(1);
  });

  it('should list the allowed patterns when rejecting a branch', () => {
    // Act
    const result = validateBranch('my-branch');

    // Assert
    expect(result.stderr).toContain(
      '<type>: feature, bugfix, hotfix, chore, ai, copilot, cursor, claude, codex',
    );
  });

  it('should fail with a usage error when HEAD_REF is missing', () => {
    // Act
    const result = runScript({ script: SCRIPT, env: {} });

    // Assert
    expect(result.exitCode).toBe(2);
  });
});
