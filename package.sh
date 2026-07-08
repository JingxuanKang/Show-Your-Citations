#!/bin/bash
# Package the Chrome extension into a zip for a GitHub Release.
# The Cloudflare Worker (cloudflare/), tooling (tools/) and docs are excluded.
set -euo pipefail
cd "$(dirname "$0")"

TEMP_DIR="show-your-citations"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/lib"

cp manifest.json popup.html popup.js styles.css \
   background.js options.html options.js options.css \
   LICENSE "$TEMP_DIR/"
cp lib/api.js "$TEMP_DIR/lib/"
cp -r icons "$TEMP_DIR/"

VERSION=$(grep '"version"' manifest.json | head -1 | cut -d '"' -f 4)
ZIP_NAME="show-your-citations-v${VERSION}.zip"
rm -f "$ZIP_NAME"
zip -rq "$ZIP_NAME" "$TEMP_DIR"
rm -rf "$TEMP_DIR"

echo "✅ Packaged $ZIP_NAME ($(du -h "$ZIP_NAME" | cut -f1))"
echo "Next: create a GitHub Release and upload $ZIP_NAME"
