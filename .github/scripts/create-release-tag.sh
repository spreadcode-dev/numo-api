#!/usr/bin/env bash
# Tags a commit as `tag_v-<version>.<build>` on `origin`, where <build> is the
# commit's UTC committer date (YYYYMMDDHHMM). Skips if that tag already exists.
# Usage: create-release-tag.sh <version> <commit-sha>
set -euo pipefail

readonly TAG_PREFIX='tag_v-'

if [[ $# -ne 2 || -z "$1" || -z "$2" ]]; then
  echo "Usage: $0 <version> <commit-sha>" >&2
  exit 2
fi
readonly version="$1"
readonly commit_sha="$2"

# The committer date of a merge done on GitHub is the moment it reached main.
# Unlike the current time, it's the same on every re-run, so re-runs are no-ops.
build=$(TZ=UTC git show --no-patch --date=format-local:%Y%m%d%H%M --format=%cd "$commit_sha")
readonly tag="${TAG_PREFIX}${version}.${build}"

if [[ -n "$(git ls-remote --tags origin "refs/tags/$tag")" ]]; then
  echo "Tag $tag already exists on origin, skipping."
  exit 0
fi

git tag "$tag" "$commit_sha"
git push --quiet origin "refs/tags/$tag"
echo "Created tag $tag on $commit_sha."
