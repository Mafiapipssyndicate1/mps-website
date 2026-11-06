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
