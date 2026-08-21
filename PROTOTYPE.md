# Handoff — Sajjel (سجّل) POC Prototype

## What this is
An interactive, single-file HTML prototype of **سجّل / Sajjel**, a merchant↔customer debt-ledger app (Saudi context, amounts in ر.س), built from the user's POC spec document. Fully Arabic, `dir="rtl"`, rendered inside a phone frame (~430px, full-bleed on mobile). One screen simulates both phones: a **تاجر / عميل** role toggle in the app bar switches sides mid-flow.

## Deliverable & locations
- **Source of truth:** `index.html` in this repo (~115 KB, self-contained: CSS + HTML + vanilla JS, no build step, no external deps except Google Fonts "Cairo"). It is what Netlify serves; see `netlify.toml`.
- The brand guides live in `brand/` and are served at `/identity`.

## Design system
- Palette: mist `#EDE9E6` (bg), sage `#5C766D` (chrome, primary actions, dark text — both `--ink` and `--steel`), tan `#C9996B` (accent and pay CTAs). Source: colorhunt.co/palette/ede9e6c9996b5c4f4a5c766d. The fourth swatch, brown `#5C4F4A`, was the original `--steel` and was dropped in commit 005a23b when the brand dark colour became `#5C766D`; every derived tint in the file sits in the same warm family. CSS variables at the top of `<style>`.
- Outside the palette, on purpose: WhatsApp green (`#25D366`, `#075E54`, `#DCF8C6`) on the payment-link sheet, black for Apple Pay, and dark green for the مدى button. These are other people's brands and reading them as such is the point.
- Font: Cairo. Logo: notebook/checklist SVG badge, gold on ink.
- Status pills: 🟢 مسدد (green) / 🔵 دين نشط (blue) / 🔴 متأخر (red) / ⚫ بلغ الحد (dark). "Due soon" (amber) styling exists (`st-amber`) but no customer currently uses it.

## Architecture (all in one file)
- Screens are `<div class="screen" id="...">` toggled by `go(id)`; a `switch` in `go()` maps screens → render functions. Screens prefixed `s-` are auth (welcome/OTP) and hide the app bar + bottom nav.
- **State:** `const S = {...}` (role, screen, pending request, notif arrays, unread counts, timers `iv`, `billTmp`, `bid`, selections, `hideAmt`, `wa`). Customers in `C` (keys: `ahmed`, `khalid`, `salem`, later `faisal`), merchant order in `S.order`. Customer-side merchants in `CM` (`rayan` is `dyn:true` → mirrors `C.ahmed`; `noor`, `duha` static). Invoices in `BILLS` map keyed `b1…`, tx rows carry `billId`.
- Top-level `const`s are script-scoped (not on `window`) — inline `onclick` handlers still resolve them; for programmatic testing use `window.eval` in the page context (see Verification).
- Screens prefixed `w-` are the web checkout page and hide the app bar and bottom nav the same way `s-` does — the customer is in a browser there, not in the app.
- `go(id)` handles navigation and chrome; the render switch it used to hold lives in `renderScreen(id)`, so the amount-visibility toggle can redraw the current screen without re-running the slide animation.
- No persistence: refresh = full reset (the settings screen's "إعادة التعيين" button uses `location.reload()`).

## Seed data
- Merchant: بقالة الريان; defaults limit **1,000 ر.س** / **30 days** (editable in m-settings).
- أحمد محمد `0550 123 456`: balance **800**, due 27 أغسطس 2026, inherited limits.
- خالد علي: 0 (settled). سالم العتيبي: **1,250**, overdue since 27 يوليو (22 days), **custom limit 1,500** (shows ✦ marker + custom state in per-customer settings).
- Customer side: الريان (dynamic = Ahmed's balance and limit), سوق النور (0, limit 500), مخبز الضحى (420, limit 600, overdue).
- All dues land on the 27th — see §Unified pay-day.

## Implemented flows (all verified working)
1. **Auth:** welcome → choose role → fake OTP (4 boxes, auto-advance, any digits) → dashboard.
2. **Merchant dashboard:** stats (customers / outstanding / overdue) + customer cards → account detail (hero, limit/available/due, tx list).
3. **New purchase (m-new):** select customer via chips **or** scan permanent profile QR (`openScanner('profile')` → simulate → selects Ahmed); live projected-balance line (`renderProj`) flags limit breach; optional description; **optional invoice upload** (see §Invoice). Submit routes: over limit → **m-limit block screen** (with shortcut to edit that customer's limit); overdue customer → **m-warn-overdue** with "متابعة على أي حال" (`continueAnyway`); else `proceedSend`.
4. **Two-way QR approval:** `proceedSend` creates `S.pending` + customer notification → merchant waits (m-wait). Switch to عميل → notification (actionable, highlighted) → c-purchase screen: amount/desc/after-balance (+invoice link if attached), canvas QR (deterministic from token via mulberry32), **real 2:00 countdown** (`startCountdown`, pulses red ≤20s, expires → overlay + `regen()` button issues new token). Switch back to تاجر → m-scan → `simulateScan()` guards: no pending / customer hasn't opened QR (`shown`) / expired — each toasts; success applies balance, unshifts tx, recomputes due date (`dueFromDays`), marks the notif done, → m-success summary.
5. **Connect new customer:** m-add (mobile prefilled `0561 234 567`) → same QR dance → creates **فيصل الدوسري** with inherited defaults.
6. **Customer side:** dashboard stats + merchant cards; account detail with gold "سداد الآن"; permanent profile QR (c-qr, ID-only, drawn lazily once); profile/logout.
7. **Settlement:** c-pay — full vs custom amount (segmented control), **Apple Pay** (black button) or Visa; simulated gateway sequence (3 staged overlay messages ≈2.2s incl. Webhook step) → c-pay-success (amount, remaining, method, `PAY-XXXXXXXX` ref); Rayan payments update Ahmed live, clear overdue at 0, and push an instant **merchant notification**.
8. **Notifications:** bell badge + customer nav badge, unread counts, actionable items (open approval screens), done/cancel states. `cancelPending` removes stale actionable notifs.
9. **Amount visibility:** eye button on m-dash, c-dash, m-account, c-account toggles the global `S.hideAmt`; `money()`, `numv()` and `signed()` render `•••• ر.س` while it is on, `paintEyes()` keeps the four icons in sync. Approval, settlement and web-checkout figures stay visible — you are acting on those.
10. **Transactions counter:** a card on each dashboard, from `txStats()` over the ledgers: total, purchases, settlements.
11. **Merchant home QR:** fixed card at the top of m-dash (`sajjel://m/rayan`), canvas drawn once behind `S.qrMerchDrawn`.
12. **Credit limit bar:** `limitBar(used, limit, dark)` — fill colour steps at 60 / 85 / 100 % (`lb-ok` → `lb-warm` → `lb-hot` → `lb-full`) and the note under it changes with the step. In the dark hero variant the top row is dropped, since the hero grid already shows limit and available; in the customer's credit card it carries both.
13. **Unified pay-day:** `PAYDAY = 27`; `dueFromDays()` adds the term then rolls forward to the first 27th on or after it. `paydayStrip(dark)` renders the gold strip on both dashboards, both heroes, the purchase confirmation and the web checkout.
14. **WhatsApp payment link and web checkout:** see §Web checkout below.
15. **Settings:** merchant defaults; per-customer overrides (m-cust-settings) with checkbox-gated inputs showing "موروث من الافتراضي (…)" vs "قيمة مخصصة", save/reset; **demo tool** `demoOverdue()` flips Ahmed overdue (due 15 أغسطس, 3 days) to demo the warning path.

## Invoice/bill feature (added on request, after initial build)
- m-new has "الفاتورة / الإيصال (اختياري)": hidden `<input type="file" id="billInp" accept="image/*,application/pdf">` + dashed dropzone (`billDrop`) ⇄ preview chip (`billPrev`: thumbnail via FileReader dataURL for images, doc icon for PDF, filename, ✕ remove). >4 MB rejected with toast.
- Carried on `S.pending.bill`; customer confirm screen shows `ppBillRow` link → viewer. On confirmed scan: stored in `BILLS`, tx gets `billId`, success shows "الفاتورة: مرفقة ✓".
- `txRow()` renders a gold paperclip tag "الفاتورة" on both merchant & customer tx lists → `viewBill(id)` opens an in-phone overlay `#billView` (image, or doc-card for PDFs with note that real app would preview). Reset on new purchase & cancel.

## Web checkout (added on request)
- `waPurchase()` (m-new, needs a customer and an amount) and `waDebt()` (m-account, needs a balance) build `S.wa` — kind, customer, amount, an 8-char ref, and `https://pay.sajjel.sa/r/<ref>` — then open `#waSheet`, a mock WhatsApp thread showing the message as the customer would receive it. `waText()` writes it: a purchase reads as a request to pay now, a debt reads as a reminder naming the pay-day.
- "فتح واتساب بالرسالة الجاهزة" calls `window.open` on a real `wa.me` deep link with the text URL-encoded. "معاينة الرابط كما يفتحه العميل" jumps straight to `w-pay` instead, so the whole path demos on one device.
- `w-pay` is drawn as a browser page: URL bar, Sajjel mark, amount, pay-day strip, Apple Pay / مدى / card. `payWeb(method)` reuses the staged gateway overlay, then `w-success`.
- Effects: a debt link reduces the balance, adds a `دفعة عبر رابط ويب` row and notifies the merchant; a purchase link creates no ledger row (nothing was owed) and notifies the merchant of an immediate payment. `exitWeb()` returns to whichever role was active.
- In-app settlement gained a مدى button next to Apple Pay and Visa; `methodTxt()` maps the three method keys to labels on both success screens.

## Branding (latest change)
Product name displays as **سجّل** (with shadda) in exactly 3 places: `<title>`, app-bar `.brand`, welcome `.w-name`. Ordinary words (تسجيل الدخول etc.) intentionally untouched.

## Verification workflow (reuse this after any edit)
1. Extract + syntax-check JS: `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > check.js && node --check check.js` (piping into `node --check /dev/stdin` fails — use the temp file).
2. Python cross-check: every `$('id')` in JS exists as `id="..."` in HTML; every inline handler function exists (`reload`/`remove`/`click` are DOM built-ins; the `if` hit is the benign `onclick="if(event.target===this)closeBill()"` on `#billView`); tag-balance counts.
3. jsdom runtime smoke test (`npm i jsdom` in a scratch directory): stub canvas `getContext`, drive flows via `dom.window.eval(...)` (NOT `window.S` — script-scope consts aren't window props). For file upload, construct `new File(...)` and `Object.defineProperty(inp,'files',...)` then call `handleBill(inp)`; allow ~300ms for FileReader and ~2.6s for the payment overlay chain. Last full run: purchase 800→900 with the due date snapping to 27 سبتمبر, WhatsApp link → web checkout clearing سالم's 1,250, masking on and off, both counters, both limit bars, مدى in and out of the app — all green.
4. Screenshots: Chromium is available at `/opt/pw-browsers/chromium`, so `npm i playwright` and drive the page with `page.evaluate("setRole('merchant')")` to check layout after any visual change.

## Conventions to preserve
- Reply to the user in **English** (their messages are English); all UI text in Arabic.
- Keep it a single self-contained file; vanilla JS, function declarations + inline `onclick` strings; numbers via `fmt()` = `toLocaleString('en-US')`; dates as Arabic strings (base date `new Date(2026,7,18)`, `TODAY='18 أغسطس'`).
- Edit `index.html` with exact anchors; re-run the verification workflow before delivering.

## Known limitations / candidate next steps (none requested yet)
- No persistence (localStorage was deliberately avoided — unsupported in claude.ai artifacts; file runs standalone so it *could* be added if user opens locally, but confirm first).
- `st-amber` "due soon" status unused by seed data; no automated due-soon computation — the pay-day strip states the date but nothing counts down to it.
- Amount masking is not persisted and does not re-arm when the app is backgrounded.
- The merchant home QR is display-only; the scanner flows still start from m-new and m-add.
- Payment links are generated client-side and never expire or get consumed; opening one twice would pay twice.
- PDF invoices show a placeholder card, not a rendered preview.
- Timers intentionally keep running across navigation (simulates real expiry).
- If the user later wants a real app: spec suggests Flutter/Firebase + Moyasar/Tap gateway; this file is the UX reference.
