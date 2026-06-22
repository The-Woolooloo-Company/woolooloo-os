// E2E tests with Playwright
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should show login page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Welcome back');
  });

  test('should fail with invalid credentials', async ({ page }) => {
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should show dashboard after login', async ({ page }) => {
    // TODO: Implement with valid test credentials
    // await page.goto('/');
    // await expect(page.locator('h1')).toContainText('Dashboard');
  });
});

test.describe('Config', () => {
  test('should show config page', async ({ page }) => {
    // TODO: Implement with valid test credentials
    // await page.goto('/config');
    // await expect(page.locator('h1')).toContainText('Settings');
  });
});
