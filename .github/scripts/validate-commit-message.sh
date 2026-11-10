#!/usr/bin/env bash
# Checks that every non-merge commit of a pull request is titled
# "#<issue-number>: <description>".
# Usage: BASE_SHA=<sha> HEAD_SHA=<sha> validate-commit-message.sh
set -euo pipefail

readonly MESSAGE_PATTERN='^#[0-9]+: .+$'

if [[ -z "${BASE_SHA:-}" || -z "${HEAD_SHA:-}" ]]; then
  echo "Usage: BASE_SHA=<sha> HEAD_SHA=<sha> $0" >&2
  exit 2
fi

invalid_subjects=()
while IFS= read -r subject; do
  if [[ ! "$subject" =~ $MESSAGE_PATTERN ]]; then
    invalid_subjects+=("$subject")
  fi
done < <(git log --no-merges --format=%s "$BASE_SHA..$HEAD_SHA")

if [[ ${#invalid_subjects[@]} -eq 0 ]]; then
  echo "Every commit message follows '#<issue-number>: <description>'."
  exit 0
fi

{
  echo "These commit messages don't follow '#<issue-number>: <description>':"
  printf '  %s\n' "${invalid_subjects[@]}"
  echo "Fix the last commit with: git commit --amend -m \"#<issue-number>: <description>\""
  echo "Then push with: git push --force-with-lease"
} >&2
exit 1
