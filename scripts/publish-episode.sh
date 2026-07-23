#!/usr/bin/env bash
# Publish one OVERRIPE (or any series) episode:
#   1. (re-encode if > 48MB) upload the video to Supabase Storage
#   2. write the episode manifest pointing at the Storage URL
#   3. update the catalog
#   4. DELETE the local source video (freeing disk)
# Then commit + push (auto-deploys on Vercel).
#
# Usage:
#   scripts/publish-episode.sh <series-id> <ep-number> "<Title>" "<source.mp4>"
# Example:
#   scripts/publish-episode.sh overripe 5 "Overripe" "series/OVERRIPE/Episode 5.mp4"
#
# Reads SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL from app/.env.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERIES="$1"; N="$2"; TITLE="$3"; SRC="$4"
[ -z "$SRC" ] && { echo "usage: $0 <series-id> <ep-number> <title> <source.mp4>"; exit 1; }
set -a; . "$ROOT/app/.env"; set +a
URL="${VITE_SUPABASE_URL}"; SR="${SUPABASE_SERVICE_ROLE_KEY}"
BUCKET="episodes"
BASE="$ROOT/app/public/generated/$SERIES"
mkdir -p "$BASE/e$N"

# Re-encode if over ~48MB (Supabase free-tier per-file limit is 50MB)
SIZE=$(stat -f%z "$SRC" 2>/dev/null || stat -c%s "$SRC")
UP="$SRC"
if [ "$SIZE" -gt 50000000 ]; then
  echo "  re-encoding (>50MB)…"
  UP="/tmp/pub_e$N.mp4"
  ffmpeg -y -i "$SRC" -c:v libx264 -crf 27 -preset veryfast -c:a aac -b:a 128k "$UP" 2>/dev/null
fi

echo "  uploading e$N.mp4 to Supabase…"
curl -s -X POST "$URL/storage/v1/object/$BUCKET/$SERIES/e$N.mp4" \
  -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "x-upsert: true" \
  -H "Content-Type: video/mp4" --data-binary "@$UP" >/dev/null
[ "$UP" != "$SRC" ] && rm -f "$UP"

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$SRC" | cut -d. -f1)
VURL="$URL/storage/v1/object/public/$BUCKET/$SERIES/e$N.mp4"
cat > "$BASE/e$N/episode.json" <<JSON
{ "title": "$TITLE — Ep. $N", "bakedAudio": true, "langs": [],
  "videoUrl": "$VURL",
  "shots": [ { "speaker": "", "imageUrl": "/generated/$SERIES/poster.jpg", "clipUrl": "$VURL", "voiceUrls": {}, "captions": {}, "durationSec": $DUR } ] }
JSON
echo "  manifest written (e$N, ${DUR}s, video on Supabase)"

# delete the local source — it's hosted online now
rm -f "$SRC" && echo "  ✔ local source deleted (freed disk)"
echo "Now: add e$N to the catalog episodes[] and: git add -A && git commit && git push"
