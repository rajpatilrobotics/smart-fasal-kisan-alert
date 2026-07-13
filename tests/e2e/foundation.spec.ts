import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { E2E_DOMAIN_API_ORIGIN, E2E_MP_QUERY_API_ORIGIN } from './origins';

const serviceByProject = {
  farmer: 'farmer-web',
  mp: 'mp-web',
  rsk: 'rsk-web',
} as const;

test('redirects to the truthful Milestone 1 authentication shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/auth$/u);
  await expect(page.locator('main')).toBeVisible();
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await expect(page.getByText(/Milestone 0/i)).toHaveCount(0);
});

test('applies a unique nonce policy to each rendered document', async ({ request }, testInfo) => {
  const firstResponse = await request.get('/auth');
  const secondResponse = await request.get('/auth');
  const firstPolicy = firstResponse.headers()['content-security-policy'];
  const secondPolicy = secondResponse.headers()['content-security-policy'];
  const firstScripts = firstPolicy
    ?.split('; ')
    .find((directive) => directive.startsWith('script-src '));
  const secondScripts = secondPolicy
    ?.split('; ')
    .find((directive) => directive.startsWith('script-src '));
  const firstNonce = firstScripts?.match(/'nonce-([^']+)'/u)?.[1];
  const secondNonce = secondScripts?.match(/'nonce-([^']+)'/u)?.[1];

  if (!firstPolicy || !firstScripts || !firstNonce || !secondNonce) {
    throw new Error('Rendered document is missing its Content Security Policy nonce');
  }
  expect(firstNonce).not.toBe(secondNonce);
  expect(firstScripts).toContain("'strict-dynamic'");
  expect(firstScripts).not.toContain("'unsafe-inline'");
  expect(firstPolicy).toContain(E2E_DOMAIN_API_ORIGIN);
  if (testInfo.project.name === 'mp') {
    expect(firstPolicy).toContain(E2E_MP_QUERY_API_ORIGIN);
  } else {
    expect(firstPolicy).not.toContain(E2E_MP_QUERY_API_ORIGIN);
  }

  const firstDocument = await firstResponse.text();
  expect(firstDocument).toContain(`nonce="${firstNonce}"`);
});

test('publishes the shared liveness contract', async ({ request }, testInfo) => {
  const projectName = testInfo.project.name as keyof typeof serviceByProject;
  const response = await request.get('/api/health/live');

  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as Record<string, unknown>;
  expect(payload).toMatchObject({
    service: serviceByProject[projectName],
    status: 'ok',
  });
});

test('@a11y has no automatically detectable critical foundation violations', async ({ page }) => {
  await page.goto('/auth');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('@a11y reflows at a narrow viewport with usable touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto('/auth');

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  for (const button of await page.locator('main').getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
});
