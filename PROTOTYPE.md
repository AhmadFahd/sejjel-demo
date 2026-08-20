# Handoff — Sajjel (سجّل) POC Prototype

## What this is
An interactive, single-file HTML prototype of **سجّل / Sajjel**, a merchant↔customer debt-ledger app (Saudi context, amounts in ر.س), built from the user's POC spec document. Fully Arabic, `dir="rtl"`, rendered inside a phone frame (~430px, full-bleed on mobile). One screen simulates both phones: a **تاجر / عميل** role toggle in the app bar switches sides mid-flow.

## Deliverable & locations
- **Final file (source of truth):** `/mnt/user-data/outputs/sajjel-prototype.html` — identical copy at `/home/claude/sajjel-prototype.html` (~89.5 KB, self-contained: CSS + HTML + vanilla JS, no build step, no external deps except Google Fonts "Cairo").
- Original build parts `/home/claude/p1.html` (head+CSS), `p2.html` (body), `p3.html` (script) are **stale** — all edits after initial assembly were made directly on `sajjel-prototype.html`. Do not re-concatenate the parts.
- Full prior transcript: `/mnt/transcripts/2026-08-18-15-52-56-sajjel-arabic-prototype.txt` (contains the complete POC spec document — read incrementally if spec details are needed).

## Design system
- Palette: mist `#EDE9E6` (bg), sage `#5C766D` (chrome and dark text, kept in the `--ink` variable), brown `#5C4F4A` (primary actions, kept in the `--steel` variable), tan `#C9996B` (accent/pay CTAs). Source: colorhunt.co/palette/ede9e6c9996b5c4f4a5c766d. CSS variables at top of `<style>`; every derived tint in the file was remapped to the same warm family.
- Font: Cairo. Logo: notebook/checklist SVG badge, gold on ink.
- Status pills: 🟢 مسدد (green) / 🔵 دين نشط (blue) / 🔴 متأخر (red) / ⚫ بلغ الحد (dark). "Due soon" (amber) styling exists (`st-amber`) but no customer currently uses it.

## Architecture (all in one file)
- Screens are `<div class="screen" id="...">` toggled by `go(id)`; a `switch` in `go()` maps screens → render functions. Screens prefixed `s-` are auth (welcome/OTP) and hide the app bar + bottom nav.
- **State:** `const S = {...}` (role, screen, pending request, notif arrays, unread counts, timers `iv`, `billTmp`, `bid`, selections). Customers in `C` (keys: `ahmed`, `khalid`, `salem`, later `faisal`), merchant order in `S.order`. Customer-side merchants in `CM` (`rayan` is `dyn:true` → mirrors `C.ahmed`; `noor`, `duha` static). Invoices in `BILLS` map keyed `b1…`, tx rows carry `billId`.
- Top-level `const`s are script-scoped (not on `window`) — inline `onclick` handlers still resolve them; for programmatic testing use `window.eval` in the page context (see Verification).
- No persistence: refresh = full reset (the settings screen's "إعادة التعيين" button uses `location.reload()`).

## Seed data
- Merchant: بقالة الريان; defaults limit **1,000 ر.س** / **30 days** (editable in m-settings).
- أحمد محمد `0550 123 456`: balance **800**, due 25 أغسطس 2026, inherited limits.
- خالد علي: 0 (settled). سالم العتيبي: **1,250**, overdue 8 days, **custom limit 1,500** (shows ✦ marker + custom state in per-customer settings).
- Customer side: الريان (dynamic = Ahmed's balance), سوق النور (0), مخبز الضحى (420, overdue).

## Implemented flows (all verified working)
1. **Auth:** welcome → choose role → fake OTP (4 boxes, auto-advance, any digits) → dashboard.
2. **Merchant dashboard:** stats (customers / outstanding / overdue) + customer cards → account detail (hero, limit/available/due, tx list).
3. **New purchase (m-new):** select customer via chips **or** scan permanent profile QR (`openScanner('profile')` → simulate → selects Ahmed); live projected-balance line (`renderProj`) flags limit breach; optional description; **optional invoice upload** (see §Invoice). Submit routes: over limit → **m-limit block screen** (with shortcut to edit that customer's limit); overdue customer → **m-warn-overdue** with "متابعة على أي حال" (`continueAnyway`); else `proceedSend`.
4. **Two-way QR approval:** `proceedSend` creates `S.pending` + customer notification → merchant waits (m-wait). Switch to عميل → notification (actionable, highlighted) → c-purchase screen: amount/desc/after-balance (+invoice link if attached), canvas QR (deterministic from token via mulberry32), **real 2:00 countdown** (`startCountdown`, pulses red ≤20s, expires → overlay + `regen()` button issues new token). Switch back to تاجر → m-scan → `simulateScan()` guards: no pending / customer hasn't opened QR (`shown`) / expired — each toasts; success applies balance, unshifts tx, recomputes due date (`dueFromDays`), marks the notif done, → m-success summary.
5. **Connect new customer:** m-add (mobile prefilled `0561 234 567`) → same QR dance → creates **فيصل الدوسري** with inherited defaults.
6. **Customer side:** dashboard stats + merchant cards; account detail with gold "سداد الآن"; permanent profile QR (c-qr, ID-only, drawn lazily once); profile/logout.
7. **Settlement:** c-pay — full vs custom amount (segmented control), **Apple Pay** (black button) or Visa; simulated gateway sequence (3 staged overlay messages ≈2.2s incl. Webhook step) → c-pay-success (amount, remaining, method, `PAY-XXXXXXXX` ref); Rayan payments update Ahmed live, clear overdue at 0, and push an instant **merchant notification**.
8. **Notifications:** bell badge + customer nav badge, unread counts, actionable items (open approval screens), done/cancel states. `cancelPending` removes stale actionable notifs.
9. **Settings:** merchant defaults; per-customer overrides (m-cust-settings) with checkbox-gated inputs showing "موروث من الافتراضي (…)" vs "قيمة مخصصة", save/reset; **demo tool** `demoOverdue()` flips Ahmed overdue (due 15 أغسطس, 3 days) to demo the warning path.

## Invoice/bill feature (added on request, after initial build)
- m-new has "الفاتورة / الإيصال (اختياري)": hidden `<input type="file" id="billInp" accept="image/*,application/pdf">` + dashed dropzone (`billDrop`) ⇄ preview chip (`billPrev`: thumbnail via FileReader dataURL for images, doc icon for PDF, filename, ✕ remove). >4 MB rejected with toast.
- Carried on `S.pending.bill`; customer confirm screen shows `ppBillRow` link → viewer. On confirmed scan: stored in `BILLS`, tx gets `billId`, success shows "الفاتورة: مرفقة ✓".
- `txRow()` renders a gold paperclip tag "الفاتورة" on both merchant & customer tx lists → `viewBill(id)` opens an in-phone overlay `#billView` (image, or doc-card for PDFs with note that real app would preview). Reset on new purchase & cancel.

## Branding (latest change)
Product name displays as **سجّل** (with shadda) in exactly 3 places: `<title>`, app-bar `.brand`, welcome `.w-name`. Ordinary words (تسجيل الدخول etc.) intentionally untouched.

## Verification workflow (reuse this after any edit)
1. Extract + syntax-check JS: `sed -n '/<script>/,/<\/script>/p' sajjel-prototype.html | sed '1d;$d' > check.js && node --check check.js` (pipe directly into `node --check /dev/stdin` fails in this env — use the temp file).
2. Python cross-check: every `$('id')` in JS exists as `id="..."` in HTML; every inline handler function exists (`reload`/`remove`/`click` are DOM built-ins; the `if` hit is the benign `onclick="if(event.target===this)closeBill()"` on `#billView`); tag-balance counts.
3. jsdom runtime smoke test (jsdom already `npm install`ed in `/home/claude`): stub canvas `getContext`, drive flows via `dom.window.eval(...)` (NOT `window.S` — script-scope consts aren't window props). For file upload, construct `new File(...)` and `Object.defineProperty(inp,'files',...)` then call `handleBill(inp)`; allow ~300ms for FileReader and ~2.6s for the payment overlay chain. Last full runs: all flows green (purchase 800→920, pay 500→420, connection creates faisal, limit/overdue guards, cancel, demoOverdue, custom-settings, full bill lifecycle incl. PDF path).
4. Copy to `/mnt/user-data/outputs/` and call `present_files` — **required every time**, otherwise the user (possibly on mobile) can't access the update.

## Conventions to preserve
- Reply to the user in **English** (their messages are English); all UI text in Arabic.
- Keep it a single self-contained file; vanilla JS, function declarations + inline `onclick` strings; numbers via `fmt()` = `toLocaleString('en-US')`; dates as Arabic strings (base date `new Date(2026,7,18)`, `TODAY='18 أغسطس'`).
- Edit the final file via `str_replace` with exact anchors; re-run the verification workflow before delivering.

## Known limitations / candidate next steps (none requested yet)
- No persistence (localStorage was deliberately avoided — unsupported in claude.ai artifacts; file runs standalone so it *could* be added if user opens locally, but confirm first).
- `st-amber` "due soon" status unused by seed data; no automated due-soon computation.
- PDF invoices show a placeholder card, not a rendered preview.
- Timers intentionally keep running across navigation (simulates real expiry).
- If the user later wants a real app: spec suggests Flutter/Firebase + Moyasar/Tap gateway; this file is the UX reference.
