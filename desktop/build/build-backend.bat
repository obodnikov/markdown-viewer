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

echo ============================================
echo   Building Markdown Viewer Backend
echo ============================================
echo Project root: %PROJECT_ROOT%
echo.

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: python not found. Please install Python 3.
    exit /b 1
)

python --version

REM Install PyInstaller if not present
python -m PyInstaller --version >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

echo.

REM Install backend dependencies
echo Installing backend dependencies...
pip install -r "%PROJECT_ROOT%\backend\requirements.txt"
echo.

REM Clean previous build
echo Cleaning previous build artifacts...
if exist "%SCRIPT_DIR%dist" rmdir /s /q "%SCRIPT_DIR%dist"
if exist "%SCRIPT_DIR%work" rmdir /s /q "%SCRIPT_DIR%work"

REM Build
echo Running PyInstaller...
cd /d "%PROJECT_ROOT%"
python -m PyInstaller "%SCRIPT_DIR%pyinstaller.spec" ^
    --distpath "%SCRIPT_DIR%dist" ^
    --workpath "%SCRIPT_DIR%work" ^
    --clean ^
    --noconfirm

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
