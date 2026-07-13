import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const serviceByProject = {
  farmer: 'farmer-web',
  mp: 'mp-web',
  rsk: 'rsk-web',
} as const;

test('renders a truthful stakeholder foundation', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Milestone 0/i)).toBeVisible();
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
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
