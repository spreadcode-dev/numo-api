#!/usr/bin/env bash
# Checks that a pull request has exactly one commit, except for release
# (release/* -> main) and sync (main -> develop) PRs, which carry many.
# Usage: BASE_REF=<branch> HEAD_REF=<branch> BASE_SHA=<sha> HEAD_SHA=<sha> validate-commit-count.sh
set -euo pipefail

if [[ -z "${BASE_REF:-}" || -z "${HEAD_REF:-}" || -z "${BASE_SHA:-}" || -z "${HEAD_SHA:-}" ]]; then
  echo "Usage: BASE_REF=<branch> HEAD_REF=<branch> BASE_SHA=<sha> HEAD_SHA=<sha> $0" >&2
  exit 2
fi

if [[ "$HEAD_REF" == release/* && "$BASE_REF" == "main" ]] ||
  [[ "$HEAD_REF" == "main" && "$BASE_REF" == "develop" ]]; then
  echo "'$HEAD_REF' -> '$BASE_REF' may contain several commits."
  exit 0
fi

commit_count=$(git rev-list --count "$BASE_SHA..$HEAD_SHA")
if [[ "$commit_count" -eq 1 ]]; then
  echo "The pull request has exactly one commit."
  exit 0
fi

cat >&2 <<EOF
The pull request has $commit_count commits; it must have exactly one.
Squash them into a single commit with:
  git fetch origin
  git reset --soft \$(git merge-base origin/$BASE_REF HEAD)
  git commit -m "#<issue-number>: <description>"
  git push --force-with-lease
EOF
exit 1
