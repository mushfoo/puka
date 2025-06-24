import { test, expect } from '@playwright/test';

test('styles are loaded', async ({ page }) => {
  await page.goto('/');
  
  // Wait a bit for styles to load
  await page.waitForTimeout(2000);
  
  // Take a screenshot
  await page.screenshot({ path: 'style-check.png', fullPage: true });
  
  // Check if body has styles
  const bodyBgColor = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  
  console.log('Body background color:', bodyBgColor);
  
  // Check if any element has Tailwind classes
  const hasFlexElement = await page.locator('.flex').count();
  console.log('Elements with flex class:', hasFlexElement);
});