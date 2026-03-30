# AGENTS.md

## Project

Talenta HR attendance automation — auto clock in/out via Playwright stealth browser. Runs locally (Windows Task Scheduler) or remotely (GitHub Actions + cron-job.org).

## Tech Stack

- Node.js (ES Modules), Playwright, dotenv, consola
- Package manager: pnpm
- CI: GitHub Actions (workflow_dispatch only, triggered by external cron service)
- VPN: Tailscale exit node (routes CI traffic through Indonesian IP)

## Commands

```bash
pnpm install                # Install deps + Playwright browsers
pnpm run clock-in           # Run clock in
pnpm run clock-out          # Run clock out
pnpm run install-browsers   # Manually install Playwright browsers
```

No test suite, linter, or build step.

## Architecture

**Execution flow:** `clock-in.js` / `clock-out.js` → `launchStealthBrowser()` → `ensureLoggedIn()` → navigate to `/live-attendance` → `humanClick()` on button → intercept `attendance_clocks` POST to confirm → `logout()` → close browser. 3 retries per run; final failure saves screenshot.

**Modules:**
- `src/browser/stealth-utils.js` — Stealth Chromium launcher (anti-detection patches, geolocation spoofing, WebRTC leak protection, hardened geolocation override via parameterized `addInitScript`). Exports `launchStealthBrowser()`, `humanClick(page, locator)` (3-tier fallback: normal → force → event dispatch), `randomDelay(min, max)`.
- `src/attendance/auth.js` — `ensureLoggedIn(page, log)` auto-detects login page, skips if session exists. `logout(page, log)` navigates to `/site/sign-out`.
- `src/attendance/clock-in.js` / `clock-out.js` — Entry points. Clock-out handles an extra confirmation dialog.
- `src/core/logger.js` — `createLogger(tag)` wraps consola with `DD/MM/YYYY HH:mm:ss` timestamps.
- `scripts/*.bat` — Batch wrappers (hardcoded to `D:\ci-co-automation`).
- `scripts/setup-schedule.ps1` — Registers Windows scheduled tasks (clock in 08:55, clock out 18:05).

**GitHub Actions** (`.github/workflows/clock-in.yml`, `clock-out.yml`):
- `workflow_dispatch` only — cron-job.org sends POST to GitHub API to trigger
- Tailscale VPN exit node routes traffic through Indonesian IP; verified via `ipinfo.io`
- `TZ: Asia/Jakarta` env ensures date commands use WIB
- Geolocation varies by weekday (Mon/Fri alternate coords, Tue-Thu default Jakarta office)
- `CRON_ENABLED` repo variable gates cron runs; manual dispatch always runs
- Headless on ubuntu-latest, pnpm 9, Node 20
- Error screenshots uploaded as artifacts (3-day retention)

## Environment Variables

From `.env` (see `.env.example`):
- `TALENTA_EMAIL` / `TALENTA_PASSWORD` — credentials (required)
- `HEADLESS` — `"true"` for headless (CI sets this; local default `false`)
- `GEO_LAT` / `GEO_LNG` — geolocation override (defaults to Jakarta office)

GitHub Actions secrets (Tailscale VPN):
- `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` — Tailscale OAuth client credentials
- `TS_EXIT_NODE` — exit node hostname/IP in Indonesia

## Conventions

- All source uses ES Module syntax (`import`/`export`)
- Always use `createLogger(tag)` for logging, never raw `console.log`
- Always use `humanClick(page, locator)` for click interactions, never bare `locator.click()`
- Some log messages are in Indonesian ("berhasil" = success, "gagal" = failed)
