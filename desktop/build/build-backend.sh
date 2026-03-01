#!/bin/bash
# Build the Flask backend into a standalone binary using PyInstaller.
#
# Usage:
#   cd desktop && npm run build:backend
#   — or —
#   bash desktop/build/build-backend.sh
#
# Output:
#   desktop/build/dist/markdown-viewer-backend

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$SCRIPT_DIR/.buildvenv"

echo "============================================"
echo "  Building Markdown Viewer Backend"
echo "============================================"
echo "Project root: $PROJECT_ROOT"
echo ""

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Please install Python 3."
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")

if [ "$PYTHON_MAJOR" != "3" ]; then
    echo "ERROR: Python 3 is required, found Python $PYTHON_VERSION"
    exit 1
fi

echo "Python: python3 ($PYTHON_VERSION)"
echo ""

# Create isolated virtual environment for the build
echo "Creating build virtual environment..."
python3 -m venv --clear "$VENV_DIR" || { echo "ERROR: Failed to create virtual environment."; exit 1; }
source "$VENV_DIR/bin/activate"

echo "Installing PyInstaller and backend dependencies..."
pip install --quiet --upgrade pip
pip install --quiet pyinstaller
pip install --quiet -r "$PROJECT_ROOT/backend/requirements.txt" || {
    echo "ERROR: Failed to install dependencies."
    deactivate
    exit 1
}

echo "PyInstaller: $(python -m PyInstaller --version)"
echo ""

# Clean previous build output
echo "Cleaning previous build artifacts..."
rm -rf "$SCRIPT_DIR/dist"

# Build
echo "Running PyInstaller..."
cd "$PROJECT_ROOT"
python -m PyInstaller "$SCRIPT_DIR/pyinstaller.spec" \
    --distpath "$SCRIPT_DIR/dist" \
    --workpath "$SCRIPT_DIR/work" \
    --clean \
    --noconfirm || {
    echo "ERROR: PyInstaller build failed."
    deactivate
    exit 1
}

# Clean up work directory
rm -rf "$SCRIPT_DIR/work"

# Deactivate venv
deactivate

echo ""
echo "============================================"
echo "  Build complete!"
echo "============================================"

BINARY="$SCRIPT_DIR/dist/markdown-viewer-backend"
if [ -f "$BINARY" ]; then
    echo "Binary: $BINARY"
    echo "Size: $(du -h "$BINARY" | cut -f1)"
    echo ""
    echo "Test with:"
    echo "  $BINARY --port 5050 --host 127.0.0.1"
else
    echo "ERROR: Binary not found at $BINARY"
    exit 1
fi
