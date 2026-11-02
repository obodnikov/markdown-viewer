import { test, expect } from '@playwright/test';

const SHORTCUT = process.platform === 'darwin' ? 'Meta+f' : 'Control+f';

test.describe('Find bar', () => {
  let page;
  let editor;
  let input;
  let count;

  async function highlighted(name) {
    return page.evaluate((highlightName) => {
      const highlight = CSS.highlights.get(highlightName);
      return highlight ? [...highlight].map((range) => range.toString()) : [];
    }, name);
  }

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    editor = page.locator('#editor textarea');
    input = page.locator('#find-input');
    count = page.locator('#find-count');
  });

  test('opens with the shortcut and closes with Esc', async () => {
    await editor.fill('text');
    await expect(page.locator('#find-bar')).toBeHidden();

    await page.keyboard.press(SHORTCUT);
    await expect(page.locator('#find-bar')).toBeVisible();
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#find-bar')).toBeHidden();
    await expect(page.locator('.text-mirror')).toHaveCount(0);
  });

  test('counts, moves between matches and highlights them', async () => {
    await editor.fill('cat dog cat\n\nanother cat');
    await page.locator('#btn-find').click();
    await input.fill('cat');

    await expect(count).toHaveText('1 of 3');
    await page.keyboard.press('Enter');
    await expect(count).toHaveText('2 of 3');
    await page.keyboard.press('Shift+Enter');
    await expect(count).toHaveText('1 of 3');

    // Three in the editor copy and three in the preview
    expect(await highlighted('find-match')).toEqual(['cat', 'cat', 'cat', 'cat', 'cat', 'cat']);
    expect(await highlighted('find-current')).toEqual(['cat']);
  });

  test('finds Cyrillic text with case and whole word options', async () => {
    await editor.fill('Кот кот котлета');
    await page.locator('#btn-find').click();
    await input.fill('кот');
    await expect(count).toHaveText('1 of 3');

    await page.locator('#find-word').click();
    await expect(count).toHaveText('1 of 2');

    await page.locator('#find-case').click();
    await expect(count).toHaveText('1 of 1');
  });

  test('searches what the reader sees in preview mode', async () => {
    await editor.fill('see **bold** text and [a link](http://hidden.example)');
    await page.locator('#btn-find').click();

    await input.fill('hidden');
    await expect(count).toHaveText('1 of 1');

    await page.locator('.view-tab[data-view="preview"]').click();
    await expect(count).toHaveText('No results');

    await input.fill('bold text');
    await expect(count).toHaveText('1 of 1');
    expect(await highlighted('find-current')).toEqual(['bold text']);
  });

  test('scrolls the editor to a match far down and keeps the copy aligned', async () => {
    const lines = Array.from({ length: 400 }, (_, i) => `line ${i} ${'long text that wraps '.repeat(12)}`);
    lines[380] = 'needle is here';
    // fill() takes over a minute for this much text in WebKit
    await editor.evaluate((textarea, text) => {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, lines.join('\n'));
    await page.locator('.view-tab[data-view="edit"]').click();

    await page.locator('#btn-find').click();
    await input.fill('needle');
    await expect(count).toHaveText('1 of 1');

    const position = await page.evaluate(() => {
      const textarea = document.querySelector('#editor textarea');
      const highlight = [...CSS.highlights.get('find-current')][0];
      const rect = highlight.getBoundingClientRect();
      const box = textarea.getBoundingClientRect();
      const content = document.querySelector('.text-mirror__content');
      return {
        scrollTop: textarea.scrollTop,
        visible: rect.top >= box.top && rect.bottom <= box.bottom,
        wrappedHeight: content.getBoundingClientRect().height,
        textareaHeight: textarea.scrollHeight
      };
    });

    expect(position.scrollTop).toBeGreaterThan(0);
    expect(position.visible).toBe(true);
    // Same height means every line wrapped in the same place
    expect(Math.abs(position.wrappedHeight - position.textareaHeight)).toBeLessThan(2);
  });

  test('editing with the bar open updates the count and keeps the text editable', async () => {
    await editor.fill('cat');
    await page.locator('#btn-find').click();
    await input.fill('cat');
    await expect(count).toHaveText('1 of 1');

    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' cat');
    await expect(editor).toHaveValue('cat cat');
    await expect(count).toHaveText('1 of 2');
  });

  test('Esc selects the current match in the editor', async () => {
    await editor.fill('dog cat');
    await page.locator('#btn-find').click();
    await input.fill('cat');
    await expect(count).toHaveText('1 of 1');
    await page.keyboard.press('Escape');

    await expect(editor).toBeFocused();
    const selected = await editor.evaluate((el) => el.value.substring(el.selectionStart, el.selectionEnd));
    expect(selected).toBe('cat');
  });

  test('Replace button opens Find & Replace with the query', async () => {
    await editor.fill('cat');
    await page.locator('#btn-find').click();
    await input.fill('cat');
    await page.locator('#find-open-replace').click();

    await expect(page.locator('#find-replace-dialog')).toBeVisible();
    await expect(page.locator('#fr-find')).toHaveValue('cat');
    await expect(page.locator('#fr-preset')).toHaveValue('contains');
  });

  test('a pattern that matches nothing no longer hangs Find & Replace', async () => {
    await editor.fill('abc');
    await page.locator('#action-find-replace').click();
    await page.locator('#fr-preset').selectOption('custom');
    await page.locator('#fr-find').fill('x*');
    await page.locator('#fr-preview-btn').click();
    await expect(page.locator('#fr-preview-stats')).toContainText('4 matches');
  });
});
