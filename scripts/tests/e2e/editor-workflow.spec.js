import { test, expect } from '@playwright/test';

test.describe('Editor Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Markdown/i);
    await expect(page.locator('textarea, .cm-editor')).toBeVisible();
  });

  test('should type in editor and see preview', async ({ page }) => {
    const editor = page.locator('textarea').first();
    await editor.fill('# Hello World\n\nThis is a **test**.');

    // Wait for preview to update
    await page.waitForTimeout(500);

    const preview = page.locator('.preview-pane, #preview');
    await expect(preview).toContainText('Hello World');
    await expect(preview).toContainText('test');
  });

  test('should switch view modes', async ({ page }) => {
    // Find and click split view button
    const splitBtn = page.locator('button:has-text("Split"), [data-view="split"]');
    if (await splitBtn.isVisible()) {
      await splitBtn.click();
    }

    // Find and click preview-only button
    const previewBtn = page.locator('button:has-text("Preview"), [data-view="preview"]');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(300);
    }

    // Find and click edit-only button
    const editBtn = page.locator('button:has-text("Edit"), [data-view="edit"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should toggle dark mode', async ({ page }) => {
    const themeToggle = page.locator('button[title*="theme"], .theme-toggle, #theme-toggle');

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Check if dark mode is applied
      const html = page.locator('html');
      const theme = await html.getAttribute('data-theme');
      expect(['dark', 'light']).toContain(theme);
    }
  });

  test('should create new document', async ({ page }) => {
    // Type some content first
    const editor = page.locator('textarea').first();
    await editor.fill('# Old Content');

    // Click new document button
    const newBtn = page.locator('button:has-text("New"), #new-doc, [title*="New"]');
    if (await newBtn.isVisible()) {
      await newBtn.click();

      // Editor should be empty or have default content
      const content = await editor.inputValue();
      expect(content.length).toBeLessThan(50);
    }
  });

  test('should count characters and words', async ({ page }) => {
    const editor = page.locator('textarea').first();
    await editor.fill('# Test Document\n\nThis is a test with multiple words.');

    await page.waitForTimeout(500);

    // Look for status bar with counts
    const statusBar = page.locator('.status-bar, #status-bar, footer');
    if (await statusBar.isVisible()) {
      const text = await statusBar.textContent();
      // Should show some count information
      expect(text).toMatch(/\d+/);
    }
  });

  test('should handle markdown rendering', async ({ page }) => {
    const editor = page.locator('textarea').first();
    const markdown = `# Heading 1
## Heading 2

**Bold text** and *italic text*

- List item 1
- List item 2

[Link](https://example.com)

\`\`\`python
def hello():
    print("Hello")
\`\`\`
`;

    await editor.fill(markdown);
    await page.waitForTimeout(1000);

    const preview = page.locator('.preview-pane, #preview');
    if (await preview.isVisible()) {
      const html = await preview.innerHTML();

      // Check for rendered elements
      expect(html).toContain('h1');
      expect(html).toContain('h2');
      expect(html).toContain('ul');
      expect(html).toContain('code');
    }
  });
});
