#!/usr/bin/env bash
# Assemble the publish directory: the static prototype at the root,
# the brand guides at /brand, the merchant pitch deck at /marketing,
# the stakeholder business-model deck at /domain/business_model, and the two
# user manuals at /manual/merchant and /manual/customer.
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

npm ci --prefix manual
npm run build --prefix manual
mkdir -p _site/manual
cp -r manual/dist/merchant _site/manual/merchant
cp -r manual/dist/customer _site/manual/customer
rm -f _site/manual/merchant/_redirects _site/manual/customer/_redirects
