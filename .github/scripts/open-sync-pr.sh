#!/usr/bin/env bash
# Opens a pull request from main into develop when develop is missing commits
# from main, unless one is already open. Needs the gh CLI authenticated
# (GH_TOKEN, GH_REPO) and up-to-date origin/main and origin/develop refs.
# Usage: open-sync-pr.sh <version>
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <version>" >&2
  exit 2
fi
readonly version="$1"

missing_commits=$(git log --oneline origin/develop..origin/main)
if [[ -z "$missing_commits" ]]; then
  echo "develop already has everything from main, nothing to sync."
  exit 0
fi
echo "Commits on main missing from develop:"
echo "$missing_commits"

open_pr_url=$(gh pr list --base develop --head main --state open --json url --jq '.[0].url // empty')
if [[ -n "$open_pr_url" ]]; then
  echo "Sync PR already open: $open_pr_url; it picks up the new commits."
  exit 0
fi

gh pr create --base develop --head main \
  --title "Sync Release $version (main into develop)" \
  --body "$(
    cat <<EOF
Brings the commits below from \`main\` into \`develop\`, opened automatically after a push to \`main\`.

\`\`\`
$missing_commits
\`\`\`

Merge it with a **merge commit** (not squash) to keep the release history on \`develop\`. CI doesn't run on this PR: pull requests opened by GitHub Actions don't trigger other workflows, and these commits were already validated on their way to \`main\`.
EOF
  )"
