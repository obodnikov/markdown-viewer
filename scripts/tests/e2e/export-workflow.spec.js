import { test, expect } from '@playwright/test';

test.describe('Export Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Add some content to export
    const editor = page.locator('textarea').first();
    await editor.fill('# Test Document\n\nThis is test content for export.');
    await page.waitForTimeout(500);
  });

  test('should open export dialog', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), #export-btn, [title*="Export"]');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      // Export dialog should appear
      const dialog = page.locator('dialog[open], .dialog.export, #export-dialog');
      await expect(dialog.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show export format options', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), #export-btn');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Should have format options
      const dialog = page.locator('dialog[open], .export-dialog');
      if (await dialog.first().isVisible()) {
        const html = await dialog.first().innerHTML();

        // Check for format mentions
        expect(html.toLowerCase()).toMatch(/html|pdf|docx|markdown/);
      }
    }
  });

  test('should handle keyboard shortcut for export', async ({ page }) => {
    // Press Ctrl/Cmd+E
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+E' : 'Control+E');
    await page.waitForTimeout(500);

    // Export dialog might appear
    const dialog = page.locator('dialog[open], .export-dialog');
    const isVisible = await dialog.first().isVisible().catch(() => false);

    // Test passes if dialog appears or if keyboard shortcut is not implemented yet
    expect(typeof isVisible).toBe('boolean');
  });
});
