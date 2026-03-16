export async function ensureLoggedIn(page, log) {
  log.start('Navigating to Talenta...');
  await page.goto('https://hr.talenta.co/live-attendance', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check if login form exists (means not logged in yet)
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoginPage) {
    log.info('Already logged in, skipping login...');
    return;
  }

  log.info('Filling credentials...');
  await page.fill('input[type="email"], input[name="email"]', process.env.TALENTA_EMAIL);
  await page.locator('input[type="password"]').first().fill(process.env.TALENTA_PASSWORD);

  log.start('Signing in...');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for login form to disappear (means login succeeded)
  log.info('Waiting for login to complete...');
  await emailInput.waitFor({ state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(2000);
  log.success('Login successful');
}

export async function logout(page, log) {
  try {
    log.start('Logging out...');

    // Try navigating to logout URL directly (most reliable)
    await page.goto('https://hr.talenta.co/site/sign-out', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify we're back at login page
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLoginPage) {
      log.success('Logout berhasil');
    } else {
      log.warn('Logout mungkin belum berhasil, tapi browser akan ditutup');
    }
  } catch (error) {
    log.warn(`Logout error: ${error.message}, browser akan tetap ditutup`);
  }
}