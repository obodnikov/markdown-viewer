@echo off
REM Build the Flask backend into a standalone binary using PyInstaller.
REM
REM Usage:
REM   cd desktop && npm run build:backend
REM   — or —
REM   desktop\build\build-backend.bat
REM
REM Output:
REM   desktop\build\dist\markdown-viewer-backend.exe

setlocal

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..
set VENV_DIR=%SCRIPT_DIR%work\.buildvenv

echo ============================================
echo   Building Markdown Viewer Backend
echo ============================================
echo Project root: %PROJECT_ROOT%
echo.

REM Check for Python 3
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: python not found. Please install Python 3.
    exit /b 1
)

REM Verify Python 3
python -c "import sys; exit(0 if sys.version_info.major == 3 else 1)" 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python 3 is required.
    python --version
    exit /b 1
)

for /f "tokens=*" %%i in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PYTHON_VERSION=%%i
echo Python: %PYTHON_VERSION%
echo.

REM Create isolated virtual environment for the build
echo Creating build virtual environment...
python -m venv "%VENV_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"

echo Installing PyInstaller and backend dependencies...
pip install --quiet --upgrade pip
pip install --quiet pyinstaller
pip install --quiet -r "%PROJECT_ROOT%\backend\requirements.txt"
echo.

REM Clean previous build output (keep venv for faster rebuilds)
echo Cleaning previous build artifacts...
if exist "%SCRIPT_DIR%dist" rmdir /s /q "%SCRIPT_DIR%dist"

REM Build
echo Running PyInstaller...
cd /d "%PROJECT_ROOT%"
python -m PyInstaller "%SCRIPT_DIR%pyinstaller.spec" ^
    --distpath "%SCRIPT_DIR%dist" ^
    --workpath "%SCRIPT_DIR%work" ^
    --clean ^
    --noconfirm

REM Deactivate venv
call deactivate

echo.
echo ============================================
echo   Build complete!
echo ============================================

set BINARY=%SCRIPT_DIR%dist\markdown-viewer-backend.exe
if exist "%BINARY%" (
    echo Binary: %BINARY%
    echo.
    echo Test with:
    echo   %BINARY% --port 5050 --host 127.0.0.1
) else (
    echo ERROR: Binary not found at %BINARY%
    exit /b 1
)

endlocal
