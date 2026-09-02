# Tech stack

The app that replaces the prototype. Everything here was settled on the
[wayfinder map](https://github.com/AhmadFahd/sejjel-demo/issues/11) or on one of
its tickets; this file records what was chosen and why, so nobody has to read an
issue thread to find out.

## Where the app lives

`app/`, not the repository root. The root already serves `index.html` as the
published prototype, and Vite treats a root `index.html` as its own entry point,
so the two cannot share a directory without one of them being renamed. The
prototype, the brand pages and the two Slidev decks keep their places until
[#22](https://github.com/AhmadFahd/sejjel-demo/issues/22) moves the deployment.

## Choices

| Piece | Choice | Why |
|---|---|---|
| Framework | TanStack Start (React) | Server functions and file routing in one app, with a long-lived Node server for the SSE stream. |
| Styling | Tailwind CSS 4 | The prototype's stylesheet becomes tokens in [#17](https://github.com/AhmadFahd/sejjel-demo/issues/17). |
| Language | TypeScript, strict | `noUnusedLocals`, `noUnusedParameters` and `noUncheckedSideEffectImports` are on, as the scaffold sets them. |
| Data | Drizzle ORM over libSQL | One driver for a local SQLite file and for Turso, per [#13](https://github.com/AhmadFahd/sejjel-demo/issues/13). Wiring is [#15](https://github.com/AhmadFahd/sejjel-demo/issues/15). |
| Database | SQLite file in development and previews, Turso in production | [#13](https://github.com/AhmadFahd/sejjel-demo/issues/13). |
| Hosting | Railway, one instance | [#13](https://github.com/AhmadFahd/sejjel-demo/issues/13). The Nitro Railway preset came in with the scaffold. |
| Live updates | Server-sent events | [#14](https://github.com/AhmadFahd/sejjel-demo/issues/14). Needs a process that stays up, which is why the host is not serverless. |
| Lint and format | ESLint with `@tanstack/eslint-config`, Prettier | The scaffold's toolchain option. |

Versions are pinned in `app/package.json` rather than floating on `latest`. At
the time of scaffolding: TanStack Start 1.168, TanStack Router 1.170, React 19.2,
Vite 8.2, Tailwind 4.3, TypeScript 6.0, ESLint 9.39, Node 22.

## Not chosen yet

- A payment gateway. Moyasar and Tap are the candidates named in `MVP.md`, and
  both are out of scope for this map; a fake sits behind the interface in
  [#18](https://github.com/AhmadFahd/sejjel-demo/issues/18).
- An SMS provider, for the same reason.
- A test runner. [#19](https://github.com/AhmadFahd/sejjel-demo/issues/19) picks it.
- An i18n library. [#16](https://github.com/AhmadFahd/sejjel-demo/issues/16) picks it; the
  `paraglide` add-on is one candidate.
