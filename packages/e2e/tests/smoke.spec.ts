import { test, expect } from '@playwright/test'

test('app root loads @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Record Store/)
})

test('health endpoint responds @smoke', async ({ request }) => {
  const response = await request.get('http://localhost:3001/health')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toEqual({ status: 'ok' })
})
