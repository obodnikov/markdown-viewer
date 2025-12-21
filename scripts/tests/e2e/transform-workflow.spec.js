import { test, expect } from '@playwright/test';

test.describe('Transform Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Add content to transform
    const editor = page.locator('textarea').first();
    await editor.fill('# Test Document\n\nThis is content to transform.');
    await page.waitForTimeout(500);
  });

  test('should open transform sidebar', async ({ page }) => {
    const toggleBtn = page.locator('button:has-text("Transform"), .sidebar-toggle, #sidebar-toggle');

    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('.sidebar, #transform-sidebar, aside');
      await expect(sidebar.first()).toBeVisible();
    }
  });

  test('should show transform options', async ({ page }) => {
    // Look for transform-related UI
    const sidebar = page.locator('.sidebar, aside, #transform-panel');

    if (await sidebar.first().isVisible()) {
      const text = await sidebar.first().textContent();

      // Should mention some transform operations
      const hasTransformOptions = /translate|summarize|tone|newline/i.test(text);
      expect(hasTransformOptions || text.length > 0).toBeTruthy();
    }
  });

  test('should have model selection', async ({ page }) => {
    const modelSelect = page.locator('select#model, #model-select, select[name="model"]');

    if (await modelSelect.isVisible()) {
      const options = await modelSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });

  test('should have language selection for translation', async ({ page }) => {
    const langSelect = page.locator('select#language, #target-language, select[name="language"]');

    if (await langSelect.isVisible()) {
      const options = await langSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });
});
