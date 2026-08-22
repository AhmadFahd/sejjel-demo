#!/usr/bin/env bash
# Assemble the publish directory: the static prototype at the root,
# the brand guides at /brand, and the built pitch deck at /marketing.
set -euo pipefail

rm -rf _site
mkdir -p _site

cp index.html logo.svg icon.svg _site/
cp -r brand _site/brand

npm ci --prefix pitch
npm run build --prefix pitch -- --base /marketing/ --out dist
cp -r pitch/dist _site/marketing
# The SPA rewrite lives in netlify.toml; drop Slidev's own copy so there is one source of truth.
rm -f _site/marketing/_redirects
