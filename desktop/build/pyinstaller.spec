# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for Markdown Viewer Flask backend.

Compiles the Flask backend into a standalone binary so end users
don't need Python installed. The binary accepts the same CLI args
as app.py (--host, --port, --debug).

Build:
    cd <project_root>
    pyinstaller desktop/build/pyinstaller.spec \
        --distpath desktop/build/dist \
        --workpath desktop/build/work \
        --clean

Output:
    desktop/build/dist/markdown-viewer-backend
"""

import os
import sys

block_cipher = None
project_root = os.path.abspath(os.path.join(os.path.dirname(SPEC), '..', '..'))

a = Analysis(
    [os.path.join(project_root, 'backend', 'app.py')],
    pathex=[project_root],
    binaries=[],
    datas=[
        # Backend modules (PyInstaller sometimes misses these with try/except imports)
        (os.path.join(project_root, 'backend', 'routes'), 'backend/routes'),
        (os.path.join(project_root, 'backend', 'services'), 'backend/services'),
        (os.path.join(project_root, 'backend', 'config.py'), 'backend'),
        (os.path.join(project_root, 'backend', '__init__.py'), 'backend'),
        # LLM prompts file used by the backend
        (os.path.join(project_root, 'LLM_PROMPTS.md'), '.'),
    ],
    hiddenimports=[
        # Flask and extensions
        'flask',
        'flask_cors',
        'dotenv',
        'werkzeug',
        'jinja2',
        'markupsafe',
        'click',
        'itsdangerous',
        'blinker',
        # Backend modules (try/except imports confuse PyInstaller)
        'backend.config',
        'backend.routes.llm',
        'backend.routes.github',
        'backend.routes.export',
        'backend.routes.bookstack',
        'backend.services.openrouter',
        'backend.services.github_service',
        'backend.services.bookstack_service',
        'backend.services.export_service',
        # Direct imports used by services
        'config',
        'routes.llm',
        'routes.github',
        'routes.export',
        'routes.bookstack',
        'services.openrouter',
        'services.github_service',
        'services.bookstack_service',
        'services.export_service',
        # Third-party dependencies
        'requests',
        'openrouter',
        'github',
        'pypandoc',
        'html2text',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'test',
        'unittest',
        'pytest',
        'pytest_flask',
        'pytest_cov',
        'pytest_mock',
        'responses',
        'gunicorn',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='markdown-viewer-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # Keep console for logging output
    target_arch=None,
)
