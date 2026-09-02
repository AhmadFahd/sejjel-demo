# سجّل

A debt ledger between a merchant (تاجر) and a customer (عميل), for the Saudi
market. Amounts in ر.س.

## What is in this repository

| Path | What it is |
|---|---|
| `app/` | The application. TanStack Start, Tailwind, Drizzle, SQLite. |
| `index.html` | The prototype: one self-contained file, Arabic only, no backend. Still the UX reference for layout, wording and flow order. |
| `POC.md`, `PROTOTYPE.md`, `tasks/` | The use cases, what the prototype fakes, and one file per task. |
| `MVP.md`, `business_model*.md` | Scope and business model for a later release. |
| `brand/`, `logo.svg`, `icon.svg` | Brand identity. |
| `pitch/` | The Slidev decks published at `/marketing` and `/domain/business_model`. |

The work of turning the prototype into the app is tracked on the
[wayfinder map](https://github.com/AhmadFahd/sejjel-demo/issues/11) and its tickets.
`TECH_STACK.md` records what was chosen and why.

## Running the app

```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

Other scripts, all run from `app/`:

```bash
npm run build      # production build into .output
npm start          # serve that build
npm run typecheck
npm run lint
npm run format
```

## Continuous integration

`docs/ci-workflow.yml` is the GitHub Actions run for this repo: lint, types,
formatting, unit tests and the browser suite on every pull request. It has to be
moved to `.github/workflows/ci.yml` by someone whose GitHub token carries the
`workflow` scope; the automation that wrote it does not have that scope, and
GitHub refuses the push.

## Running the prototype

Open `index.html` in a browser. There is nothing to build and nothing to install.
