# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Talenta HR attendance automation. Launches a stealth Playwright Chromium browser, logs into hr.talenta.co, and clicks Clock In or Clock Out. Runs locally via Windows Task Scheduler or remotely via GitHub Actions triggered by cron-job.org.

## Commands

```bash
pnpm install                # Install deps (also runs `playwright install` via postinstall)
pnpm run clock-in           # Run clock in
pnpm run clock-out          # Run clock out
pnpm run install-browsers   # Manually install Playwright browsers
```

No test suite, linter, or build step exists.

## Architecture

All source is ES Modules (`"type": "module"` in package.json).

**Execution flow:** `clock-in.js` / `clock-out.js` → launches stealth browser → `ensureLoggedIn()` → navigates to `/live-attendance` → clicks button with human-like interaction → intercepts `attendance_clocks` POST response to confirm success → `logout()` → closes browser. Each script retries up to 3 times; final failure saves a screenshot to project root.

**Key modules:**
- `src/browser/stealth-utils.js` — `launchStealthBrowser()` returns `{ browser, context, page }`. Applies anti-detection patches via `addInitScript` (webdriver flag, fake plugins/languages/chrome runtime, permissions override, WebRTC leak protection via ICE server disabling, and hardened geolocation override that injects `getCurrentPosition`/`watchPosition` stubs with parameterized coords). Geo coords are parsed once from env vars and passed into `addInitScript({ lat, lng })`. Also exports `humanClick(page, locator)` with 3-tier fallback (normal → force → manual event dispatch) and `randomDelay(min, max)`. Chromium args include `--disable-webrtc` and `--enforce-webrtc-ip-permission-check`.
- `src/attendance/auth.js` — `ensureLoggedIn(page, log)` detects login page by email input visibility; skips login if already authenticated. `logout(page, log)` navigates to `/site/sign-out`.
- `src/core/logger.js` — `createLogger(tag)` wraps consola with custom `DD/MM/YYYY HH:mm:ss` timestamps.

**GitHub Actions workflows** (`.github/workflows/clock-in.yml`, `clock-out.yml`):
- Triggered only via `workflow_dispatch` (external cron service sends POST to GitHub API)
- Tailscale VPN exit node routes runner traffic through an Indonesian IP (`tailscale/github-action@v4` with `--exit-node`); IP verified via `ipinfo.io`
- `TZ: Asia/Jakarta` env var ensures date commands use WIB
- Geolocation varies by day of week: Mon/Fri use alternate coordinates, Tue-Thu use default Jakarta office
- `CRON_ENABLED` repo variable gates cron-triggered runs; manual dispatch always runs
- Runs headless on ubuntu-latest with pnpm 9 + Node 20
- Error screenshots uploaded as artifacts (3-day retention)

## Environment Variables

Loaded from `.env` via dotenv (see `.env.example`):
- `TALENTA_EMAIL` / `TALENTA_PASSWORD` — credentials (required)
- `HEADLESS` — `"true"` for headless mode (GitHub Actions sets this; local default is `false`)
- `GEO_LAT` / `GEO_LNG` — geolocation override (defaults to Jakarta office coords)

GitHub Actions secrets (for Tailscale VPN):
- `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` — Tailscale OAuth client credentials
- `TS_EXIT_NODE` — Tailscale exit node hostname/IP in Indonesia

## Conventions

- Logging: always use `createLogger(tag)` from `src/core/logger.js`, never raw `console.log`
- Click interactions: use `humanClick(page, locator)` from stealth-utils, never bare `locator.click()`
- Some log messages are in Indonesian (e.g. "berhasil" = success, "gagal" = failed)
- Batch scripts in `scripts/` hardcode path `D:\ci-co-automation`
