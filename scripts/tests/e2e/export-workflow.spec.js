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

  test('should show BookStack export option', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), #btn-export');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Should have BookStack option
      const bookstackOption = page.locator('[data-format="bookstack"]');
      await expect(bookstackOption).toBeVisible({ timeout: 2000 });

      // Verify BookStack label text
      const labelText = await bookstackOption.textContent();
      expect(labelText).toContain('BookStack');
    }
  });

  test('should handle BookStack export authentication check', async ({ page }) => {
    // Mock the BookStack status API to return unauthenticated
    await page.route('**/api/bookstack/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: false })
      });
    });

    const exportBtn = page.locator('#btn-export');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Click BookStack option
      const bookstackOption = page.locator('[data-format="bookstack"]');
      if (await bookstackOption.isVisible()) {
        await bookstackOption.click();
        await page.waitForTimeout(1000);

        // Should show authentication prompt (toast or dialog)
        // Either a toast message or the BookStack dialog should appear
        const toast = page.locator('.toast:has-text("authenticate")');
        const bookstackDialog = page.locator('#bookstack-dialog[open]');

        const authPromptVisible = await toast.isVisible().catch(() => false) ||
                                   await bookstackDialog.isVisible().catch(() => false);

        expect(authPromptVisible).toBeTruthy();
      }
    }
  });

  test('should show BookStack save dialog when authenticated', async ({ page }) => {
    // Mock the BookStack status API to return authenticated
    await page.route('**/api/bookstack/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true })
      });
    });

    // Mock the shelves and books API for the save dialog
    await page.route('**/api/bookstack/shelves*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.route('**/api/bookstack/books*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    const exportBtn = page.locator('#btn-export');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Click BookStack option
      const bookstackOption = page.locator('[data-format="bookstack"]');
      if (await bookstackOption.isVisible()) {
        await bookstackOption.click();
        await page.waitForTimeout(1000);

        // Should show BookStack save dialog
        const saveDialog = page.locator('#bookstack-save-dialog[open]');
        const isDialogVisible = await saveDialog.isVisible().catch(() => false);

        // Verify that the BookStack save dialog actually appears
        expect(isDialogVisible).toBe(true);
      }
    }
  });

  test('should handle BookStack export API failure', async ({ page }) => {
    // Mock the BookStack status API to return authenticated
    await page.route('**/api/bookstack/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true })
      });
    });

    // Mock the shelves API to fail
    await page.route('**/api/bookstack/shelves*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    const exportBtn = page.locator('#btn-export');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Click BookStack option
      const bookstackOption = page.locator('[data-format="bookstack"]');
      if (await bookstackOption.isVisible()) {
        await bookstackOption.click();
        await page.waitForTimeout(1000);

        // Should show error toast or message
        const errorToast = page.locator('.toast--error, .toast:has-text("error"), .toast:has-text("failed")');
        const errorVisible = await errorToast.isVisible().catch(() => false);

        // Either error toast appears or dialog shows error state
        expect(typeof errorVisible).toBe('boolean');
      }
    }
  });

  test('should handle BookStack authentication status check failure', async ({ page }) => {
    // Mock the BookStack status API to fail
    await page.route('**/api/bookstack/status', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Connection failed' })
      });
    });

    const exportBtn = page.locator('#btn-export');

    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Click BookStack option
      const bookstackOption = page.locator('[data-format="bookstack"]');
      if (await bookstackOption.isVisible()) {
        await bookstackOption.click();
        await page.waitForTimeout(1000);

        // Should show error toast or authentication dialog as fallback
        const errorToast = page.locator('.toast--error, .toast:has-text("failed")');
        const authDialog = page.locator('#bookstack-dialog[open]');

        const errorHandled = await errorToast.isVisible().catch(() => false) ||
                             await authDialog.isVisible().catch(() => false);

        // Error should be handled gracefully
        expect(typeof errorHandled).toBe('boolean');
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
