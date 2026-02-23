/**
 * Local file operations using File System Access API
 */

export class FileManager {
    constructor() {
        this.fileHandle = null;
        this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
        this.isElectron = typeof window.electronAPI !== 'undefined';
    }

    async openFile() {
        if (this.isElectron) {
            return this.openFileElectron();
        }
        if (this.supportsFileSystemAccess) {
            return this.openFileModern();
        } else {
            return this.openFileFallback();
        }
    }

    async openFileElectron() {
        try {
            const result = await window.electronAPI.openFile();
            if (result) {
                return {
                    name: result.name,
                    content: result.content,
                    filepath: result.path
                };
            }
            return null;
        } catch (error) {
            console.error('Electron open file error:', error);
            throw error;
        }
    }

    async openFileModern() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Markdown Files',
                        accept: {
                            'text/markdown': ['.md', '.markdown'],
                            'text/plain': ['.txt']
                        }
                    }
                ],
                multiple: false
            });

            this.fileHandle = fileHandle;
            const file = await fileHandle.getFile();
            const content = await file.text();

            return {
                name: file.name,
                content,
                filepath: file.name,
                handle: fileHandle
            };
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Open file error:', error);
                throw error;
            }
            return null;
        }
    }

    async openFileFallback() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.markdown,.txt';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const content = await file.text();
                    resolve({
                        name: file.name,
                        content,
                        filepath: file.name
                    });
                } else {
                    resolve(null);
                }
            };

            input.click();
        });
    }

    async saveFile(content, filename = 'document.md') {
        if (this.isElectron) {
            return this.saveFileElectron(content, filename);
        }
        if (this.supportsFileSystemAccess) {
            return this.saveFileModern(content, filename);
        } else {
            return this.saveFileFallback(content, filename);
        }
    }

    async saveFileElectron(content, filename) {
        try {
            const result = await window.electronAPI.saveFile({ content, defaultName: filename });
            if (result) {
                return {
                    success: true,
                    filepath: result.path
                };
            }
            return null;
        } catch (error) {
            console.error('Electron save file error:', error);
            throw error;
        }
    }

    async saveFileModern(content, filename) {
        try {
            let fileHandle = this.fileHandle;

            if (!fileHandle) {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: 'Markdown Files',
                            accept: {
                                'text/markdown': ['.md']
                            }
                        }
                    ]
                });
                this.fileHandle = fileHandle;
            }

            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            return {
                success: true,
                filepath: fileHandle.name
            };
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Save file error:', error);
                throw error;
            }
            return null;
        }
    }

    async saveFileFallback(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        return {
            success: true,
            filepath: filename
        };
    }

    async saveAsFile(content, filename = 'document.md') {
        this.fileHandle = null;
        return this.saveFile(content, filename);
    }

    /**
     * Clear the stored file handle
     * This forces the next save to show a "Save As" dialog
     */
    clearFileHandle() {
        this.fileHandle = null;
    }
}
