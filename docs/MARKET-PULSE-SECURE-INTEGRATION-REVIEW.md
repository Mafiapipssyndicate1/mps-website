# MPS Market Pulse — Review & Secure Integration Draft

Status: **review branch only**. This document does not change the live website, production Apps Script deployment, spreadsheet, Drive folder, Script Properties, Telegram bot, or member records.

## Branch and baseline

- Repository: `marketpsychologysociety/mps-website`
- Base: `main`
- Review branch: `review/market-pulse-secure-integration`
- Existing backend source inspected: `google-apps-script-v2/Code.gs`
- Existing public preview: `heatmap.html`
- Apps Script endpoint referenced by the website: the current MPS Web App URL already present in the repository.

## Existing backend findings

The inspected v2 source defines one `Database Member` sheet with 18 columns. It supports registration and deposit confirmation. Deposit validation is server-side and requires at least Rp1,500,000. The current `doGet()` only returns a generic ready/version response; `doPost()` only accepts `register` and `deposit`.

The inspected source does **not** implement member login, PIN verification, session issuance/revocation, Market Pulse data delivery, Learning authorization, VIP authorization, or admin authentication. The website's member-portal copy refers to ID Member + PIN, but that flow is not present in this inspected v2 file.

**Important:** `setupMPSStorage()` can create a new spreadsheet or Drive folder when the corresponding Script Properties IDs are absent. Do not run this function during this upgrade. The upgrade must preserve the existing 18-column sheet and existing Script Properties.

## Original modules reviewed

### 1. neon_heatmap_trader.html

- Three tabs: Minta Signal, Cek Pola, Signal Harian.
- Uses embedded historical datasets and local browser calculations; no live market-price feed was found in the inspected source.
- Minta Signal accepts an optional current price and user-entered capital/risk assumptions. Its output must not be represented as a live, broker-connected, or guaranteed signal.
- The module's own explanatory note says its historical percentages are optimistic; walk-forward results are around 51–54%, and the average result after spread remains negative.
- Its data cutoff is 2026-10-24. The note also flags the 1 November 2026 New York daylight-saving shift and possible one-hour WIB session displacement.

### 2. chrono_heatmap_v4.html

- Historical time-slot statistics for XAUUSD and EURUSD, with M1/M5/M15 selections and period comparisons.
- The visible selection logic uses a 55% threshold and a minimum sample count of 20 for a strong aligned label.
- The source labels the data cutoff as 2026-10-24. This is historical analysis, not a live forecast.
- Do not silently fill missing time slots or infer missing XAUUSD observations. The 04:01–04:59 WIB interval requires a data-provenance check before any correction.

### 3. pola_candle_berurutan.html

- Supports EURUSD and XAUUSD, M1/M5/M15, time-slot filtering, and candle-direction sequences of different lengths.
- The inspected source uses three comparison windows and a strong-alignment threshold of 55%, with a minimum sample count of 20.
- The data cutoff is 2026-10-24. Keep neutral-candle treatment and sample counts visible; do not convert low-sample results into strong labels.

## Security and integration decision

Do **not** copy any of the three modules' embedded datasets into a public GitHub Pages HTML file. Anything shipped to a public static page can be downloaded and inspected, even if the UI is blurred or hidden behind a JavaScript check.

Target architecture:

1. Keep `heatmap.html` as a public preview only.
2. Serve the actual member experience from the existing Apps Script Web App, after server-side member verification.
3. Authenticate using a member credential that is issued and managed by an authorized admin. Never trust a member ID, a browser flag, or a status value submitted by the client on its own.
4. Issue short-lived server-validated sessions; validate the session on every protected data request and provide a revocation path.
5. Keep module datasets and calculations out of the public website. Only return the minimum data needed after authorization.
6. Separate authorization checks for Market Pulse, Learning, VIP Briefing, and admin functions. Do not assume one valid member status grants every entitlement.
7. Do not add columns to, clear, recreate, or migrate the existing 18-column member database without a separately reviewed migration plan. Do not create a new spreadsheet or Drive folder.
8. Keep Telegram credentials and all secrets in existing Script Properties. Never expose them to HTML, browser JavaScript, GitHub, or logs.
9. Reconcile the public homepage's Rp1,000,000 copy with the backend's Rp1,500,000 validation before any release. The inspected backend currently enforces Rp1,500,000.

## Required checks before writing or deploying replacement Code.gs

- Confirm the live Apps Script project and its deployed version match the inspected repository source.
- Confirm the existing Script Properties keys and IDs without printing secret values.
- Confirm the exact member-status values used by the admin verification process.
- Determine how admin credentials and member PINs are currently issued, stored, reset, and revoked. The inspected v2 file does not answer this.
- Decide the cross-origin delivery mechanism for the GitHub Pages front end and Apps Script. Do not assume a browser `fetch()` call to Apps Script will work securely without testing.
- Audit all existing routes/actions before extending `doGet` or `doPost`; preserve registration, deposit upload, Telegram notification, and all existing sheet writes.
- Test invalid member, pending member, rejected deposit, wrong PIN, expired session, revoked session, forged client status, unauthenticated direct endpoint access, and unauthorized module access.
- Verify all three module algorithms against their original source and data, including DST handling, neutral candles, missing intervals, sample sizes, and historical performance disclosures.
- Run syntax/static checks and a test deployment that is not connected to or capable of mutating production member records before proposing deployment.

## Current change boundary

This branch is a review workspace. No production files were edited. No branch has been merged. No deployment, database setup, migration, or Telegram setup function has been run.


## Additional frontend and admin-account findings

The owner/admin Google account identified by the user is `ndhisolasi.music@gmail.com`. This is an account reference supplied by the user, not proof that an email address alone is a secure admin credential. Do not hard-code an admin password, PIN, or session secret in public website files.

The public frontend currently labels the join/deposit portal as system v4.1, while the repository backend file is explicitly labeled v2. The inspected `config.js` points both join and deposit forms to the same Apps Script Web App endpoint. `js/join.js` and `js/deposit.js` hide the legacy forms and redirect visitors to `member-portal.html`; they do not themselves submit registration or deposit data.

The portal's copy describes an ID Member + PIN process and claims backend session verification, but those functions are absent from the inspected v2 backend. This is a version/implementation mismatch that must be resolved against the actual deployed Apps Script project before relying on those access claims.

The public `config.js` contains the Web App URL. That URL is not a secret and must be treated as publicly callable. Security must come from server-side validation for every protected action, not from hiding the URL or relying on the website UI.


## Updated owner decisions — 2026-11-06

The latest owner decision supersedes earlier deposit-minimum wording:

- Official minimum first deposit for MPS membership: **Rp1,000,000**.
- The same threshold must be enforced in both the browser UI and the server-side deposit validator. The server is authoritative; a client-side minimum alone is not sufficient.
- Admin approval remains a manual decision by the authorized MPS admin after checking the registration, MT5 details, deposit amount, date, and proof.
- On successful approval, the backend should atomically/consistently mark the member as approved, issue or retain the member PIN according to the existing secure PIN flow, and grant Learning + Market Pulse access through server-validated member entitlements.
- The approval flow should send the member a private Telegram message containing a one-member invite link to the MPS VIP group. A bot cannot silently add a Telegram user to a group merely from a username; the bot must be an administrator with invite-link permission, and the member must open the invite. Prefer a single-use/limited-use invite link and avoid posting it in a public channel.
- Rejection must not grant Learning, Pulse, or VIP access. Re-issuing a PIN must not accidentally approve a pending/rejected member.
- Admin actions (approve, reject, PIN reissue, invite creation/send) must be authenticated, validated server-side, and recorded in the existing member/audit data structure without destructive schema changes.

## Cross-check result and current blockers

A fresh read of `main` confirms that `google-apps-script-v2/Code.gs` is still the v2 source (blob SHA `2975dc0cf973a3dbf91ff7e532d025ae61a74752`). It contains only the legacy storage setup, `doGet`, `doPost`, registration/deposit handlers, sheet formatting, and Telegram setup/send helpers. It enforces Rp1,500,000 server-side. It does not contain the v4.2.2 admin/member-session/Learning/Market Pulse API surface described in the owner's pasted Apps Script source.

The public homepage `index.html` currently states Rp1,000,000, so it agrees with the latest owner decision. The old GitHub backend v2 does not agree: its deposit validation and error message still require Rp1,500,000.

The owner has supplied a newer v4.2.2 `Code.gs` and `Index.html` in the conversation/Apps Script workflow. The exact active Apps Script source and deployment still need to be reconciled against those copies before a safe code replacement. Do not use the legacy v2 file as a substitute for v4.2.2, and do not deploy or modify production from this review branch.

## Admin approval acceptance tests

Before release, test at least twice (first static cross-check, then controlled functional test) that:

1. Pending, rejected, or unknown members cannot authenticate or read Learning/Pulse endpoints.
2. Only an authenticated admin can list the verification queue or approve/reject/reissue PIN.
3. A deposit below Rp1,000,000 is rejected server-side even if a client bypasses the UI.
4. An approved member receives valid member access; Learning and Pulse endpoints accept that member session.
5. Rejected members receive no entitlement and no VIP invite.
6. Approval sends a private VIP invite to the intended Telegram account only; invite permission failures are surfaced to admin and do not falsely report success.
7. Duplicate approval requests do not create multiple PINs or multiple active invites unexpectedly.
8. Session expiry/revocation, wrong PIN, brute-force limits, and direct endpoint calls are tested.
9. Existing spreadsheet ID, 18-column member sheet, Drive proof folder, Script Properties, Telegram bot token, and deployment remain unchanged.
10. Browser UI minimum, public website copy, admin validation, and server validator all show Rp1,000,000 consistently.

**Scope reminder:** this is documentation on the review branch only. No production code, spreadsheet, Drive files, Telegram configuration, or deployment has been changed.
