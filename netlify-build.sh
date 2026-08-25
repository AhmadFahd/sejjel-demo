#!/usr/bin/env bash
# Assemble the publish directory: the static prototype at the root,
# the brand guides at /brand, the merchant pitch deck at /marketing,
# and the stakeholder business-model deck at /domain/business_model.
set -euo pipefail

rm -rf _site
mkdir -p _site

cp index.html logo.svg icon.svg _site/
cp -r brand _site/brand

npm ci --prefix pitch
npm run build --prefix pitch -- --base /marketing/ --out dist
cp -r pitch/dist _site/marketing
npm run build --prefix pitch -- business-model.md --base /domain/business_model/ --out dist-business-model
mkdir -p _site/domain
cp -r pitch/dist-business-model _site/domain/business_model
# The SPA rewrites live in netlify.toml; drop Slidev's own copies so there is one source of truth.
rm -f _site/marketing/_redirects _site/domain/business_model/_redirects
