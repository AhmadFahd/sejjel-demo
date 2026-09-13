# أدلة المستخدم

Two Slidev decks, in Arabic, built from the app as it stands:

| File | Deck |
|---|---|
| `merchant.md` | دليل التاجر — the shopkeeper's side |
| `customer.md` | دليل العميل — the customer's side |

Every screenshot in `public/shots/` came out of the running app against the
`poc` seed, in one pass, so the figures on one slide agree with the next.

## Reading them

```bash
npm install
npm run dev            # the merchant deck at http://localhost:3030
npm run dev:customer   # the customer deck
```

## PDF

```bash
npm run pdf            # dist/sejjel-merchant-manual.pdf and the customer one
```

Slidev exports through Playwright's Chromium. On a machine that already has
one, point at it instead of downloading another:

```bash
npx slidev export merchant.md --executable-path /path/to/chromium \
  --output dist/sejjel-merchant-manual.pdf
```

## Static build

```bash
npm run build          # dist/merchant and dist/customer
```

`netlify-build.sh` publishes those at `/manual/merchant` and `/manual/customer`.

## Retaking the screenshots

The capture script lives at `app/.shots/all.mjs`. It drives a real browser
through both sides of a seeded ledger — signing in, recording an operation,
approving it, scanning it, paying — and writes every frame into
`manual/public/shots/`. To run it:

```bash
cd app
cp .env.example .env          # then set AUTH_SECRET and OTP_FIXED_CODE=000000
npm run build
npm run db:seed -- --reset
PORT=3200 NODE_ENV=production node .output/server/index.mjs &
node .shots/all.mjs
```

Reseed before each pass: the script spends the fixture as it goes (it records
an operation, takes a payment, spends a payment link), and a second pass over
a spent ledger takes different pictures.
