/**
 * CodeMirror editor manager
 */

export class EditorManager {
    constructor(element, onChange) {
        this.element = element;
        this.onChange = onChange;
        this.editor = null;
        this.init();
    }

    init() {
        // Note: CodeMirror 6 initialization
        // This is a placeholder that will work when CodeMirror is loaded via CDN
        // We'll use a simple textarea fallback if CodeMirror isn't available

        if (typeof CodeMirror !== 'undefined' && CodeMirror.EditorView) {
            this.initCodeMirror();
        } else {
            this.initFallback();
        }
    }

    initCodeMirror() {
        // CodeMirror 6 initialization
        const { EditorView, basicSetup } = CodeMirror;
        const { markdown } = CodeMirror.lang;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                this.onChange(this.getContent());
            }
        });

        this.editor = new EditorView({
            doc: '',
            extensions: [
                basicSetup,
                markdown(),
                updateListener
            ],
            parent: this.element
        });
    }

    initFallback() {
        // Fallback to textarea if CodeMirror not available
        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.border = 'none';
        textarea.style.resize = 'none';
        textarea.style.padding = '16px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '16px';

        textarea.addEventListener('input', () => {
            this.onChange(textarea.value);
        });

        this.element.appendChild(textarea);
        this.editor = textarea;
    }

    getContent() {
        if (this.editor instanceof HTMLTextAreaElement) {
            return this.editor.value;
        } else if (this.editor && this.editor.state) {
            return this.editor.state.doc.toString();
        }
        return '';
    }

    setContent(content) {
        if (this.editor instanceof HTMLTextAreaElement) {
            this.editor.value = content;
        } else if (this.editor && this.editor.dispatch) {
            const transaction = this.editor.state.update({
                changes: {
                    from: 0,
                    to: this.editor.state.doc.length,
                    insert: content
                }
            });
            this.editor.dispatch(transaction);
        }
    }

    focus() {
        if (this.editor instanceof HTMLTextAreaElement) {
            this.editor.focus();
        } else if (this.editor && this.editor.focus) {
            this.editor.focus();
        }
    }
}
