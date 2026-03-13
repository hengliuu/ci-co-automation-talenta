# Talenta HR Automation

Automated clock in/out for [Talenta HR](https://hr.talenta.co) using Playwright with stealth browser techniques.

## Overview

This tool automates daily attendance on Talenta HR by launching a stealth Chromium browser, logging in with your credentials, and clicking the Clock In / Clock Out button. It includes human-like interaction patterns (hover, random delays, fallback click strategies) to avoid bot detection.

## Project Structure

```
├── .github/
│   └── workflows/
│       ├── clock-in.yml       # GitHub Actions workflow for clock in
│       └── clock-out.yml      # GitHub Actions workflow for clock out
├── src/
│   ├── attendance/
│   │   ├── auth.js            # Login handler (auto-detects if already logged in)
│   │   ├── clock-in.js        # Clock in script with retry logic
│   │   └── clock-out.js       # Clock out script with retry logic
│   ├── browser/
│   │   └── stealth-utils.js   # Stealth browser launcher & human-like click helpers
│   └── core/
│       └── logger.js          # Timestamped logger using consola
├── scripts/
│   ├── clock-in.bat           # Batch wrapper for clock in
│   ├── clock-out.bat          # Batch wrapper for clock out
│   └── setup-schedule.ps1     # PowerShell script to register Windows scheduled tasks
├── .env.example               # Credential template
├── setup-task-scheduler.md    # Manual Task Scheduler setup guide
└── package.json
```

## Features

- Stealth Chromium browser with anti-detection patches (webdriver flag, fake plugins, chrome runtime spoofing)
- Human-like interactions: hover before click, randomized delays, scroll into view
- Multi-fallback click strategy (normal → force → manual event dispatch)
- Geolocation spoofing (Jakarta, Indonesia) with `id-ID` locale and `Asia/Jakarta` timezone
- Auto-login with session detection (skips login if already authenticated)
- Retry logic (up to 3 attempts) with error screenshots on final failure
- API response interception to confirm attendance was recorded
- Timestamped console logging via consola
- GitHub Actions workflows with external cron trigger (cron-job.org) for reliable scheduling
- Windows Task Scheduler integration as local alternative

## Requirements

- Node.js v16+
- pnpm (or npm)
- Stable internet connection

## Setup

### 1. Install dependencies

```bash
pnpm install
```

Playwright browsers are installed automatically via the `postinstall` script. To install them manually:

```bash
pnpm run install-browsers
```

### 2. Configure credentials

```bash
copy .env.example .env
```

Edit `.env` with your Talenta account:

```ini
TALENTA_EMAIL=your-email@example.com
TALENTA_PASSWORD=your-password
```

### 3. Test manually

```bash
# Run clock in
pnpm run clock-in

# Run clock out
pnpm run clock-out
```

## Scheduling

### GitHub Actions + cron-job.org (Recommended)

Workflows are split into 2 files: `clock-in.yml` and `clock-out.yml`. Both are triggered via `workflow_dispatch` — either manually from the GitHub Actions console or automatically via an external cron service.

#### 1. Create a GitHub Fine-Grained Personal Access Token

1. Go to [GitHub Settings > Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Set the token name, e.g. `cron-attendance-trigger`
4. Set expiration as needed (e.g. 90 days)
5. Under **Repository access**, select **Only select repositories** → choose this repo
6. Under **Permissions > Repository permissions**, set:
   - `Actions`: Read and write
   - `Contents`: Read-only
7. Click **Generate token** and save it

#### 2. Setup cron-job.org

1. Create an account at [cron-job.org](https://cron-job.org)
2. Create 2 cron jobs:

**Clock In** (08:45 WIB = 01:45 UTC):

- Title: `Talenta Clock In`
- URL: `https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/clock-in.yml/dispatches`
- Schedule: `45 1 * * 1-5` (Monday-Friday)
- Request method: `POST`
- Request headers:

  ```text
  Authorization: Bearer <GITHUB_PAT>
  Accept: application/vnd.github+v3+json
  User-Agent: cron-job.org
  ```

- Request body:

  ```json
  {"ref": "main"}
  ```

**Clock Out** (18:05 WIB = 11:05 UTC):

- Title: `Talenta Clock Out`
- URL: `https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/clock-out.yml/dispatches`
- Schedule: `5 11 * * 1-5` (Monday-Friday)
- Same request method, headers, and body as above.

> Replace `{OWNER}` and `{REPO}` with your GitHub username and repository name.

#### 3. Holiday / leave control

- Set the repository variable `CRON_ENABLED` to `false` in **Settings > Secrets and variables > Actions > Variables** to skip all cron triggers.
- `workflow_dispatch` (manual trigger) still runs regardless of the `CRON_ENABLED` value.

### Windows Task Scheduler (Alternative — Local)

#### Automated setup (PowerShell)

Run as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-schedule.ps1
```

This registers two daily Windows scheduled tasks:

- **Talenta Clock In** at 08:55
- **Talenta Clock Out** at 18:05

#### Manual setup (Task Scheduler)

See [setup-task-scheduler.md](setup-task-scheduler.md) for step-by-step instructions.

## Troubleshooting

| Issue | Solution |
| --- | --- |
| Login timeout | Check your `.env` credentials and internet connection |
| Clock In/Out button not found | Talenta UI may have changed; inspect the page and update selectors |
| Task doesn't run on schedule | Ensure the computer is awake (not in sleep/hibernate) at the scheduled time |
| Bot detection | The stealth utils should handle this, but Talenta may update their detection; check `stealth-utils.js` |
| Script errors | Check the error screenshot (`error-clock-in.png` / `error-clock-out.png`) saved in the project root |

## Notes

- The batch scripts assume the project is located at `D:\ci-co-automation`. Update the path in `scripts/clock-in.bat` and `scripts/clock-out.bat` if your project is in a different directory.
- The browser launches in headed mode (`headless: false`) so you can observe the automation. Change to `headless: true` in `stealth-utils.js` for silent operation.
