#!/usr/bin/env bash
# Checks that a version hasn't been released yet, i.e. that `origin` has no
# tag `tag_v-<version>.<build>` for it.
# Usage: validate-release-tag.sh <version>
set -euo pipefail

readonly TAG_PREFIX='tag_v-'

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <version>" >&2
  exit 2
fi
readonly version="$1"

released_tags=$(git ls-remote --tags origin "refs/tags/${TAG_PREFIX}${version}.*")
if [[ -z "$released_tags" ]]; then
  echo "Version $version hasn't been released yet."
  exit 0
fi

cat >&2 <<EOF
Version $version was already released:
$(echo "$released_tags" | sed 's|.*refs/tags/|  |')
Bump "version" in package.json (e.g. yarn version patch|minor|major) and push again.
EOF
exit 1
