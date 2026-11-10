#!/usr/bin/env bash
# Checks that a pull request's source branch follows Conventional Branch.
# Usage: HEAD_REF=<branch> validate-branch.sh
set -euo pipefail

readonly WORK_BRANCH_PATTERN='^(feature|bugfix|hotfix|chore|ai|copilot|cursor|claude|codex)/[a-z0-9]+(-[a-z0-9]+)*$'
readonly RELEASE_BRANCH_PATTERN='^release/[a-z0-9]+([.-][a-z0-9]+)*$'

if [[ -z "${HEAD_REF:-}" ]]; then
  echo "Usage: HEAD_REF=<branch> $0" >&2
  exit 2
fi

if [[ "$HEAD_REF" == "main" || "$HEAD_REF" == "develop" ]] ||
  [[ "$HEAD_REF" =~ $WORK_BRANCH_PATTERN ]] ||
  [[ "$HEAD_REF" =~ $RELEASE_BRANCH_PATTERN ]]; then
  echo "Branch '$HEAD_REF' follows the naming convention."
  exit 0
fi

cat >&2 <<EOF
Branch '$HEAD_REF' doesn't follow the naming convention. Allowed names:
  main, develop
  <type>/<issue-number>-<slug>, lowercase and hyphenated, e.g. feature/12-create-account
    <type>: feature, bugfix, hotfix, chore, ai, copilot, cursor, claude, codex
  release/<version>, e.g. release/1.2.3
Rename it with: git branch -m <new-name> && git push origin -u <new-name>
EOF
exit 1
