import { test, expect } from '@playwright/test';

test('landing page loads and shows pricing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('OptimAirWing')).toBeVisible();
  await expect(page.getByText('Profesional')).toBeVisible();
  await expect(page.getByText('250 €')).toBeVisible();
});

test('can open auth modal from pricing', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Suscribirse (250 €/m)').click();
  await expect(page.getByText('Iniciar Sesión')).toBeVisible();
});

test('login with demo credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Iniciar Sesión').first().click();
  await page.fill('input[type="email"]', 'admin');
  await page.fill('input[type="password"]', process.env.ADMIN_SECRET_KEY || 'dev_secret');
  await page.getByText('Iniciar Sesión').last().click();
  await expect(page.getByText('Simulador')).toBeVisible();
});
