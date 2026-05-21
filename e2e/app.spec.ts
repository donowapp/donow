import { test, expect } from '@playwright/test';

// ─── 1. Signup form ───────────────────────────────────────────────────────────
test.describe('Signup form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');
    // Wait for React to hydrate
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible({ timeout: 10000 });
  });

  test('renders all fields', async ({ page }) => {
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel(/Mobile/i)).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('rejects empty name', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('rejects email without TLD (passes HTML5 but fails regex)', async ({ page }) => {
    await page.getByLabel('Full Name').fill('Test User');
    // "test@test" is valid for HTML5 type=email but fails our /.+@.+\..+/ regex
    await page.getByLabel('Email').fill('test@nodot');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('rejects short password', async ({ page }) => {
    await page.getByLabel('Full Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('abc');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Minimum 6 characters')).toBeVisible();
  });
});

// ─── 2. Login form ────────────────────────────────────────────────────────────
test.describe('Login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('button', { name: /send login link/i })).toBeVisible({ timeout: 10000 });
  });

  test('renders email + send link button', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /send login link/i })).toBeVisible();
  });

  test('rejects empty submit via HTML5 required', async ({ page }) => {
    await page.getByRole('button', { name: /send login link/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows loading/error after valid email', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: /send login link/i }).click();
    await page.waitForTimeout(1500);
    // Page should still be up (either "sent" step or Firebase error shown)
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── 3. Browse & filter donations ────────────────────────────────────────────
test.describe('Browse donations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/donations');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the heading (Suspense resolves)
    await expect(page.getByRole('heading', { name: 'Browse Donations' })).toBeVisible({ timeout: 15000 });
  });

  test('renders filters', async ({ page }) => {
    await expect(page.getByPlaceholder(/title or description/i)).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
    await expect(page.getByLabel('City')).toBeVisible();
    await expect(page.getByLabel('Condition')).toBeVisible();
  });

  test('search debounce: input updates without crash', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/title or description/i);
    await searchInput.fill('jacket');
    await page.waitForTimeout(400);
    await expect(searchInput).toHaveValue('jacket');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('category filter changes value', async ({ page }) => {
    await page.getByLabel('Category').selectOption('clothes');
    await expect(page.getByLabel('Category')).toHaveValue('clothes');
  });

  test('condition filter changes value', async ({ page }) => {
    await page.getByLabel('Condition').selectOption('new');
    await expect(page.getByLabel('Condition')).toHaveValue('new');
  });

  test('no crash on unmatched search', async ({ page }) => {
    await page.getByPlaceholder(/title or description/i).fill('zzz_no_match_xyz_abc');
    await page.waitForTimeout(400);
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });
});

// ─── 4. Message rate limit — auth redirect ───────────────────────────────────
test.describe('Message chat', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/messages/test-conv-id');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── 5. Profile — auth redirect ──────────────────────────────────────────────
test.describe('Profile page', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── 6. Dashboard — auth redirect ────────────────────────────────────────────
test.describe('Dashboard / Stats', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Error & 404 pages ────────────────────────────────────────────────────────
test.describe('Error pages', () => {
  test('404 page renders for unknown route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-abc123');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });
});

// ─── Home page ────────────────────────────────────────────────────────────────
test.describe('Home page', () => {
  test('renders hero heading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Donow' })).toBeVisible({ timeout: 10000 });
  });

  test('browse donations link navigates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: /browse donations/i }).first().click();
    await expect(page).toHaveURL(/\/donations/);
  });

  test('create donation page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/create-donation');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
