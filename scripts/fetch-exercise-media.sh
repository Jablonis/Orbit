#!/usr/bin/env bash
# Downloads the exercise images and animations into public/exercise-media/.
#
# Orbit does not ship this media and does not license it to you. The files are
# © Gym visual, redistributed by the upstream dataset at 180×180 with
# permission, and reuse is governed by Gym visual's own terms:
#
#     https://gymvisual.com/
#
# Read those first. If they cover what you are doing, run this, then set
#
#     NEXT_PUBLIC_EXERCISE_MEDIA_BASE=/exercise-media
#
# and the library and the session log start showing the animations. Without it
# Orbit renders the names and the written steps, which is the default and is
# perfectly usable. The download is ~140 MB and public/exercise-media is
# ignored by git, so it never ends up in the repository or in a deployment you
# did not put it in yourself.
set -euo pipefail
cd "$(dirname "$0")/.."

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset "$tmp"
mkdir -p public/exercise-media/img public/exercise-media/gif
cp "$tmp"/images/*.jpg public/exercise-media/img/
cp "$tmp"/videos/*.gif public/exercise-media/gif/

echo "✓ $(ls public/exercise-media/img | wc -l) images, $(ls public/exercise-media/gif | wc -l) animations"
echo "  Set NEXT_PUBLIC_EXERCISE_MEDIA_BASE=/exercise-media to render them."
