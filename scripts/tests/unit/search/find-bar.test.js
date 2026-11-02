import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FindBar } from '../../../search/find-bar.js';

const BAR_HTML = `
  <button id="btn-find"></button>
  <input id="title-input">
  <dialog id="some-dialog"></dialog>
  <div id="find-bar" hidden>
    <input id="find-input">
    <span id="find-count"></span>
    <button id="find-prev"></button>
    <button id="find-next"></button>
    <button id="find-case" aria-pressed="false"></button>
    <button id="find-word" aria-pressed="false"></button>
    <button id="find-open-replace"></button>
    <button id="find-close"></button>
  </div>
  <div id="split-pane">
    <textarea id="editor"></textarea>
    <div id="preview-pane"><div id="preview"></div></div>
  </div>
`;

function createEditor(textarea) {
  const mirror = {
    enable: vi.fn(),
    disable: vi.fn(),
    update: vi.fn(),
    createRange: vi.fn((start, end) => ({ start, end })),
    scrollToRange: vi.fn()
  };
  return {
    mirror,
    getContent: () => textarea.value,
    getTextMirror: () => mirror,
    getCursorOffset: () => textarea.selectionStart,
    getSelectedText: () => textarea.value.substring(textarea.selectionStart, textarea.selectionEnd),
    hasFocus: () => document.activeElement === textarea,
    selectRange: vi.fn((start, end) => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    })
  };
}

function pressKey(target, init) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('FindBar', () => {
  let textarea;
  let editor;
  let bar;
  let input;
  let count;
  let splitPane;
  let onOpenReplace;
  // Every FindBar adds a document listener, so a shared one avoids handling keys twice
  let keydownHandlers;

  function typeQuery(text) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    vi.runAllTimers();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = BAR_HTML;

    keydownHandlers = [];
    const addEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, handler, options) => {
      if (type === 'keydown') keydownHandlers.push(handler);
      addEventListener(type, handler, options);
    });

    textarea = document.getElementById('editor');
    input = document.getElementById('find-input');
    count = document.getElementById('find-count');
    splitPane = document.getElementById('split-pane');
    editor = createEditor(textarea);
    onOpenReplace = vi.fn();

    bar = new FindBar({
      editor,
      previewElement: document.getElementById('preview'),
      previewPane: document.getElementById('preview-pane'),
      splitPane,
      onOpenReplace
    });
  });

  afterEach(() => {
    keydownHandlers.forEach((handler) => document.removeEventListener('keydown', handler));
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('opening and closing', () => {
    it('opens on Ctrl+F and on Cmd+F, and stops the browser search', () => {
      const event = pressKey(document.body, { key: 'f', ctrlKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(bar.isOpen).toBe(true);
      expect(document.getElementById('find-bar').hidden).toBe(false);
      expect(document.activeElement).toBe(input);

      bar.close();
      pressKey(document.body, { key: 'f', metaKey: true });
      expect(bar.isOpen).toBe(true);
    });

    it('opens on a non-Latin keyboard layout', () => {
      pressKey(document.body, { key: 'а', code: 'KeyF', ctrlKey: true });
      expect(bar.isOpen).toBe(true);
    });

    it('does not treat the same physical key as F on another Latin layout', () => {
      pressKey(document.body, { key: 'u', code: 'KeyF', ctrlKey: true });
      expect(bar.isOpen).toBe(false);
    });

    it('ignores Ctrl+Shift+F and a plain F', () => {
      pressKey(document.body, { key: 'F', shiftKey: true, ctrlKey: true });
      pressKey(document.body, { key: 'f' });
      expect(bar.isOpen).toBe(false);
    });

    it('opens from the toolbar button', () => {
      document.getElementById('btn-find').click();
      expect(bar.isOpen).toBe(true);
    });

    it('stays closed while a dialog is open and leaves the shortcut to the browser', () => {
      document.getElementById('some-dialog').setAttribute('open', '');
      const event = pressKey(document.body, { key: 'f', ctrlKey: true });
      expect(event.defaultPrevented).toBe(false);
      expect(bar.isOpen).toBe(false);

      bar.open();
      expect(bar.isOpen).toBe(false);
    });

    it('closes on Esc and turns the text copy off', () => {
      bar.open();
      pressKey(input, { key: 'Escape' });
      expect(bar.isOpen).toBe(false);
      expect(document.getElementById('find-bar').hidden).toBe(true);
      expect(editor.mirror.disable).toHaveBeenCalled();
    });

    it('leaves Esc to other fields such as the title', () => {
      bar.open();
      pressKey(document.getElementById('title-input'), { key: 'Escape' });
      expect(bar.isOpen).toBe(true);
    });

    it('leaves Esc to an open dialog', () => {
      bar.open();
      document.getElementById('some-dialog').setAttribute('open', '');
      pressKey(document.body, { key: 'Escape' });
      expect(bar.isOpen).toBe(true);
    });
  });

  describe('searching', () => {
    beforeEach(() => {
      textarea.value = 'cat dog cat dog cat';
      textarea.setSelectionRange(0, 0);
      bar.open();
    });

    it('counts matches and starts at the first', () => {
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 3');
      expect(input.classList.contains('is-invalid')).toBe(false);
    });

    it('shows when nothing was found and disables the arrows', () => {
      typeQuery('fish');
      expect(count.textContent).toBe('No results');
      expect(input.classList.contains('is-invalid')).toBe(true);
      expect(document.getElementById('find-next').disabled).toBe(true);
    });

    it('shows nothing for an empty query', () => {
      typeQuery('cat');
      typeQuery('');
      expect(count.textContent).toBe('');
      expect(input.classList.contains('is-invalid')).toBe(false);
    });

    it('starts from the cursor position', () => {
      bar.close();
      textarea.setSelectionRange(9, 9);
      bar.open();
      typeQuery('cat');
      expect(count.textContent).toBe('3 of 3');
    });

    it('keeps its start point while the query is being typed', () => {
      bar.close();
      textarea.setSelectionRange(5, 5);
      bar.open();
      typeQuery('c');
      typeQuery('ca');
      typeQuery('cat');
      expect(count.textContent).toBe('2 of 3');
    });

    it('moves with Enter and Shift+Enter and wraps at both ends', () => {
      typeQuery('cat');
      pressKey(input, { key: 'Enter' });
      expect(count.textContent).toBe('2 of 3');
      pressKey(input, { key: 'Enter' });
      pressKey(input, { key: 'Enter' });
      expect(count.textContent).toBe('1 of 3');
      pressKey(input, { key: 'Enter', shiftKey: true });
      expect(count.textContent).toBe('3 of 3');
    });

    it('moves with F3 and Shift+F3 from anywhere', () => {
      typeQuery('cat');
      textarea.focus();
      pressKey(textarea, { key: 'F3' });
      expect(count.textContent).toBe('2 of 3');
      pressKey(textarea, { key: 'F3', shiftKey: true });
      expect(count.textContent).toBe('1 of 3');
    });

    it('moves with the arrow buttons', () => {
      typeQuery('cat');
      document.getElementById('find-next').click();
      expect(count.textContent).toBe('2 of 3');
      document.getElementById('find-prev').click();
      expect(count.textContent).toBe('1 of 3');
    });

    it('runs a pending query on Enter instead of skipping its first match', () => {
      input.value = 'dog';
      input.dispatchEvent(new Event('input'));
      pressKey(input, { key: 'Enter' });
      expect(count.textContent).toBe('1 of 2');
    });

    it('does not move on Enter while an input method is composing', () => {
      typeQuery('cat');
      pressKey(input, { key: 'Enter', isComposing: true });
      expect(count.textContent).toBe('1 of 3');
    });

    it('applies the case and whole word options', () => {
      textarea.value = 'Cat cat catalog';
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 3');

      const caseBtn = document.getElementById('find-case');
      caseBtn.click();
      expect(caseBtn.getAttribute('aria-pressed')).toBe('true');
      expect(caseBtn.classList.contains('is-active')).toBe(true);
      expect(count.textContent).toBe('1 of 2');

      document.getElementById('find-word').click();
      expect(count.textContent).toBe('1 of 1');

      caseBtn.click();
      expect(caseBtn.getAttribute('aria-pressed')).toBe('false');
      expect(count.textContent).toBe('1 of 2');
    });

    it('scrolls to the match in the editor when moving', () => {
      typeQuery('cat');
      editor.mirror.scrollToRange.mockClear();
      pressKey(input, { key: 'Enter' });
      expect(editor.mirror.scrollToRange).toHaveBeenCalledWith({ start: 8, end: 11 });
    });
  });

  describe('document changes', () => {
    beforeEach(() => {
      textarea.value = 'cat cat';
      textarea.setSelectionRange(0, 0);
      bar.open();
      typeQuery('cat');
    });

    it('does nothing while closed', () => {
      bar.close();
      editor.mirror.update.mockClear();
      bar.refresh();
      vi.runAllTimers();
      expect(editor.mirror.update).not.toHaveBeenCalled();
    });

    it('recounts after an edit without moving the view', () => {
      editor.mirror.scrollToRange.mockClear();
      textarea.value = 'cat cat cat';
      bar.refresh();
      vi.runAllTimers();
      expect(count.textContent).toBe('1 of 3');
      expect(editor.mirror.update).toHaveBeenLastCalledWith('cat cat cat');
      expect(editor.mirror.scrollToRange).not.toHaveBeenCalled();
    });

    it('keeps the current match after an edit', () => {
      pressKey(input, { key: 'Enter' });
      textarea.value = 'cat cat cat';
      bar.refresh();
      vi.runAllTimers();
      expect(count.textContent).toBe('2 of 3');
    });

    it('keeps a match reached by wrapping around after an edit', () => {
      bar.close();
      textarea.value = 'cat';
      textarea.setSelectionRange(3, 3);
      bar.open();
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 1');

      textarea.value = 'cat cat';
      bar.refresh();
      vi.runAllTimers();
      expect(count.textContent).toBe('1 of 2');
    });
  });

  describe('view modes', () => {
    beforeEach(() => {
      textarea.value = 'see **cat** and [cat](http://cat.example)';
      textarea.setSelectionRange(0, 0);
      document.getElementById('preview').innerHTML = '<p>see <strong>cat</strong> and <a>cat</a></p>';
      bar.open();
    });

    it('counts the source text in split view', () => {
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 3');
    });

    it('counts the source text in edit view', () => {
      splitPane.dataset.view = 'edit';
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 3');
    });

    it('counts the visible text in preview view and leaves the editor alone', () => {
      splitPane.dataset.view = 'preview';
      editor.mirror.scrollToRange.mockClear();
      typeQuery('cat');
      expect(count.textContent).toBe('1 of 2');
      expect(editor.mirror.scrollToRange).not.toHaveBeenCalled();
    });

    it('recounts when the view changes', () => {
      typeQuery('cat');
      splitPane.dataset.view = 'preview';
      bar.refresh();
      vi.runAllTimers();
      expect(count.textContent).toBe('1 of 2');
    });

    it('finds a phrase split by inline markup only in the preview', () => {
      typeQuery('see cat');
      expect(count.textContent).toBe('No results');

      splitPane.dataset.view = 'preview';
      bar.refresh();
      vi.runAllTimers();
      expect(count.textContent).toBe('1 of 1');
    });
  });

  describe('focus on close', () => {
    beforeEach(() => {
      textarea.value = 'cat dog cat';
      textarea.setSelectionRange(0, 0);
      textarea.focus();
      bar.open();
      typeQuery('cat');
    });

    it('selects the current match in the editor', () => {
      pressKey(input, { key: 'Enter' });
      pressKey(input, { key: 'Escape' });
      expect(editor.selectRange).toHaveBeenCalledWith(8, 11);
      expect(document.activeElement).toBe(textarea);
    });

    it('does not move the cursor if the user went back to typing in the editor', () => {
      textarea.focus();
      pressKey(textarea, { key: 'Escape' });
      expect(bar.isOpen).toBe(false);
      expect(editor.selectRange).not.toHaveBeenCalled();
    });

    it('returns focus to the opener when there was no match', () => {
      typeQuery('fish');
      pressKey(input, { key: 'Escape' });
      expect(editor.selectRange).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe('starting query from the selection', () => {
    it('uses text selected in the editor and starts on it', () => {
      textarea.value = 'one cat two cat';
      textarea.focus();
      textarea.setSelectionRange(12, 15);
      bar.open();
      expect(input.value).toBe('cat');
      expect(count.textContent).toBe('2 of 2');
    });

    it('ignores a selection of several lines', () => {
      textarea.value = 'one\ntwo';
      textarea.focus();
      textarea.setSelectionRange(0, 7);
      bar.open();
      expect(input.value).toBe('');
    });

    it('keeps the query when reopening with nothing selected', () => {
      textarea.value = 'cat';
      textarea.setSelectionRange(0, 0);
      bar.open();
      typeQuery('cat');
      bar.close();
      bar.open();
      expect(input.value).toBe('cat');
    });
  });

  it('passes the query and options to Find & Replace', () => {
    bar.open();
    input.value = 'cat';
    document.getElementById('find-word').click();
    document.getElementById('find-open-replace').click();
    expect(onOpenReplace).toHaveBeenCalledWith({ text: 'cat', caseSensitive: false, wholeWord: true });
  });
});
