import { mkdir } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('home page renders on a 390x844 mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveTitle(/Fussball Manager/);

  await mkdir('test-results', { recursive: true });
  await page.screenshot({
    path: 'test-results/mobile-home.png',
    fullPage: true,
  });
});
