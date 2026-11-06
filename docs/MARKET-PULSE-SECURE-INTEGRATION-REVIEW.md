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


## Expanded owner requirements — 2026-11-06

### A. Registration and Telegram identity binding

The owner requires a strict two-stage member journey:

1. A visitor submits the initial registration form. The backend saves the registration and returns a member ID. **This event must not notify the admin Telegram chat.**
2. The site offers a **Connect Telegram** action tied to that member ID. The backend issues a random, opaque, single-use, short-lived linking challenge. The browser opens the official bot deep link (for example, `https://t.me/<bot_username>?start=<opaque_challenge>`).
3. The member presses Start. The bot update must be processed server-side. The backend binds the Telegram numeric user/chat identity from Telegram's authenticated update to the member ID. Never accept a Telegram ID typed by the visitor, and never use a username as proof of identity.
4. The deposit form stays locked until the backend confirms that the current member ID has a verified Telegram identity binding. A missing, expired, already-used, or mismatched challenge must fail closed and show a clear reconnect instruction.
5. The member submits deposit details and proof. The server re-checks the member ID ↔ Telegram identity binding, validates the minimum deposit of Rp1,000,000, stores the proof privately, updates the existing member row, and only then notifies the admin Telegram chat.
6. Duplicate Telegram identity binding to another member must be rejected or routed to an explicit admin recovery process. A member must not be able to overwrite an existing binding by changing a username.

Implementation constraints:
- Preserve the existing 18-column `Database Member` schema unless a separately reviewed migration is approved. A durable identity mapping may use a dedicated `Telegram Identity` tab **inside the same existing spreadsheet**, not a new spreadsheet. Proposed fields: member ID, Telegram numeric user ID, private chat ID, username snapshot (display only), linked timestamp, status, and audit timestamps. Do not store raw link challenges; store a cryptographic hash, expiry, consumed timestamp, and attempt metadata.
- Keep admin notification chat ID separate from each member's private chat ID. Never reuse one global chat ID for all member messages.
- The bot must process only private-chat `/start <challenge>` messages for account linking. Validate Telegram update structure, challenge expiry/one-time use, replay attempts, and member state.
- Choose exactly one update-delivery strategy for the bot: webhook or polling. Do not run `getUpdates` while a webhook is active. If polling is used, persist the update offset and ensure only one poller runs. If webhook is used, verify that the Apps Script endpoint is compatible with Telegram webhook delivery before enabling it; do not assume redirect behavior works.
- The bot token stays in Script Properties. Never include it in website JavaScript, HTML, GitHub, logs, or user-facing errors.

### B. Approval, member access, and VIP invitation

After the admin approves a valid deposit:
- Mark the member approved using the exact existing status vocabulary, and record the admin action.
- Issue/retain a secure PIN without exposing it in public responses.
- Grant Learning and Market Pulse access through server-side entitlements; direct endpoint calls must enforce the same checks.
- Create a private VIP invite link using Telegram's `createChatInviteLink` only after confirming the bot is an administrator of the VIP group with permission to invite users.
- Prefer a one-member, short-expiry invite. Send it to the bound private chat ID, not to a username or admin chat.
- A Telegram user must tap the invite; the bot cannot silently add them based on an ID.
- If invite creation or delivery fails, keep the member's approved status explicit but show a retryable invite-delivery failure in the admin dashboard. Do not report that the VIP invite was sent when it was not.
- Rejection never grants Learning, Pulse, or VIP access.

### C. Website platform features requested for the next build

These are first-class website features, not ad-hoc HTML edits:
- **Ad placements:** admin-managed advertiser, creative/image, destination URL, placement, start/end dates, active/paused status, and click/impression reporting. Ads require admin approval. Add clear "Iklan" labeling. Validate destinations and sanitize creatives; never permit arbitrary advertiser JavaScript.
- **Running ticker:** a configurable ticker for privacy-safe events such as "Pendaftaran member baru diterima" or "Member MPS-•••••• telah disetujui". Do not expose names, Telegram IDs/usernames, MT5 logins, deposit amounts, proof links, or PINs. Prefer aggregate/anonymized events and allow admin disable/pause.
- **News & economic calendar:** admin-curated or trusted-source-fed events for NFP, FOMC, PPI, CPI, and other material releases. Store timezone explicitly and display Asia/Jakarta (WIB), event impact, source, scheduled time, actual result, forecast, previous value, and last-updated time when available. Clearly distinguish scheduled events from confirmed results; handle source outages and revisions.
- **Announcements and maintenance notices:** admin can draft, schedule, publish, expire, and pin a banner/ticker notice. Maintenance notices need start/end time in WIB, expected impact, and status (scheduled / ongoing / completed). Do not hardcode dates into HTML.
- **Admin dashboard:** one authenticated control panel for member queue, Telegram-link state, deposit review, PIN reissue, VIP invite retry/revoke, Learning materials, Market Pulse, ads, ticker, news/events, and announcements. Enforce role checks server-side for every action and maintain an audit trail.

### D. Acceptance tests added for the complete member journey

1. Initial registration stores one member record and sends **no** admin Telegram message.
2. An unlinked member cannot submit deposit details, including by calling the endpoint directly.
3. A valid deep-link challenge links the Telegram numeric ID to the intended member only.
4. An expired, reused, altered, or wrong-member challenge is rejected.
5. A Telegram ID already bound to another member cannot be linked again without an admin recovery action.
6. Editing a Telegram username does not change the bound numeric identity.
7. Only after a successful deposit submission is an admin Telegram notification sent.
8. Rp999,999 is rejected server-side; Rp1,000,000 is accepted if all other checks pass.
9. Pending/rejected members cannot access Learning, Pulse, or VIP invitation endpoints.
10. Approval grants the correct entitlements and sends the PIN/invite only to the linked private chat.
11. VIP invite creation failure is visible and retryable; no false success message is shown.
12. One-member invite limit and expiry are enforced where Telegram supports them.
13. Ticker output never exposes personal, trading-account, proof, or authentication data.
14. Ads are admin-approved, date-bounded, labeled, and cannot inject arbitrary scripts.
15. News/event times render correctly in WIB and distinguish forecasts from actual releases.
16. Maintenance/announcement scheduling, expiration, and mobile rendering work.
17. Admin actions are logged; unauthenticated and member-level sessions cannot administer content.
18. The complete flow is tested on Android mobile, with poor network, duplicate taps, retries, and stale sessions.

## Test-data reset boundary

The owner clarified that the current member rows are fictional/test records and may be replaced before public launch. This permission applies to test records only. It does **not** automatically authorize deletion/recreation of the active spreadsheet, Drive proof folder, Script Properties, bot token, Telegram webhook, Apps Script deployment, or GitHub production branch. First identify the exact resources used by the active deployment; then propose a test-data cleanup that preserves system configuration and any real records.

## Current implementation status

This document records requirements and acceptance tests only. No production source, live Apps Script, deployment, spreadsheet, Drive file, bot, webhook, or public website has been changed by this update.


## Security audit checkpoint — 2026-11-06

This is a static review of repository files on `main`, not a penetration test and not an inspection of the live Apps Script deployment.

### Public-site findings

- The GitHub Pages repository contains multiple historical backend source files: `google-apps-script/Code.gs` and `google-apps-script-v2/Code.gs`. Both contain storage-setup routines that can create new spreadsheets/folders when Script Properties are missing. They must be treated as archival/reference code, not run against the active project.
- The public `config.js` exposes the Apps Script Web App URL. This is expected for a browser-facing endpoint; the URL must be treated as public, never as an access control.
- `member-portal.html` links the same Apps Script URL for registration/deposit, Learning, dashboard, and admin. The UI links are navigation only; each backend API must independently authenticate and authorize the caller.
- The public `join.html` and `deposit-confirmation.html` still contain legacy forms and text describing username-based verification. `js/join.js` and `js/deposit.js` hide those forms and redirect to the portal. This creates stale/contradictory public copy and should be reconciled after the live v4.2.2 UI is verified.
- The legacy `google-apps-script/Code.gs` enforces Rp1,500,000 server-side, while current public pages and owner decision use Rp1,000,000. Never deploy this legacy source; reconcile the active server validator to Rp1,000,000.
- `privacy.html` says data may be forwarded to Telegram and that Drive/Sheets access must be restricted. Confirm actual permissions on the active folder and spreadsheet; static code cannot verify Google sharing settings.
- `js/main.js` uses textContent for configurable brand/rebate copy and does not show obvious unsafe HTML insertion in the inspected portions. This is a limited source review, not proof that every page/script is XSS-free.
- The static site contains no authentication boundary of its own. VIP content and sensitive datasets must remain server-side; hiding a menu or page in JavaScript is not authorization.

### Immediate release blockers

1. Identify and freeze the exact live Apps Script project/deployment/version. Do not use either repository legacy Code.gs as a replacement for v4.2.2.
2. Inspect every public API action in active v4.2.2 for server-side role/session checks. Deny by default; member sessions must never invoke admin functions.
3. Close the legacy direct-deposit path until Telegram identity binding is confirmed server-side. A username is not proof of Telegram account ownership.
4. Ensure PINs are never returned to browser JavaScript or admin-page toast/clipboard. Send only to the verified private Telegram chat after approval.
5. Confirm private Drive proof-file permissions and restrict spreadsheet/folder sharing to the owner/admins.
6. Ensure admin login rate limits do not let anonymous callers globally lock out the real admin, and ensure sessions can expire and be revoked.
7. Confirm bot token exists only in Script Properties; do not print values in logs or chat. Choose one Telegram update mode and test delivery before switching.
8. Do not expose full member details, MT5 logins, deposit amounts, proof URLs, or Telegram identities in public ticker, dashboard, or page source.
9. Remove/retire stale legacy backend setup instructions from public repository documentation once the current architecture is confirmed.
10. Establish a known-good backup/export and recovery procedure before any production change.

### Safe test plan (non-destructive)

- Use a separate test deployment/project and test data, not the active member sheet or production bot.
- Attempt direct calls as: anonymous visitor, pending member, rejected member, approved member, and admin.
- Test forged member IDs, altered role/status values, expired/replayed sessions, wrong PINs, repeated requests, oversized uploads, invalid MIME/signature, and direct Learning/Pulse URLs.
- Verify that all rejected attempts fail server-side and do not disclose whether a private member record exists.
- Verify admin-only changes (approve/reject, PIN issue, ads/news/ticker, content upload, VIP invite) reject non-admin sessions.
- Run a mobile Android end-to-end pass for public pages, registration, Telegram binding, deposit, approval, PIN delivery, VIP invite, Learning, Pulse, and logout.
- Do not run destructive scans, brute-force tests, denial-of-service tests, or tests against unrelated domains/third-party infrastructure.

### Scope and result

No live website, active Apps Script, deployment, spreadsheet, Drive folder, Script Properties, Telegram bot, webhook, or member record was changed. The only permitted workspace for this checkpoint is this review branch. A real security clearance cannot be issued until the active v4.2.2 source and live Google resource permissions are reviewed and controlled functional tests pass.
