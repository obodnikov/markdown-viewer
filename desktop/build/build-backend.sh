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

echo "============================================"
echo "  Building Markdown Viewer Backend"
echo "============================================"
echo "Project root: $PROJECT_ROOT"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Please install Python 3."
    exit 1
fi

echo "Python: $(python3 --version)"

# Install PyInstaller if not present
if ! python3 -m PyInstaller --version &> /dev/null; then
    echo "Installing PyInstaller..."
    pip3 install pyinstaller
fi

echo "PyInstaller: $(python3 -m PyInstaller --version)"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
pip3 install -r "$PROJECT_ROOT/backend/requirements.txt"
echo ""

# Clean previous build
echo "Cleaning previous build artifacts..."
rm -rf "$SCRIPT_DIR/dist" "$SCRIPT_DIR/work"

# Build
echo "Running PyInstaller..."
cd "$PROJECT_ROOT"
python3 -m PyInstaller "$SCRIPT_DIR/pyinstaller.spec" \
    --distpath "$SCRIPT_DIR/dist" \
    --workpath "$SCRIPT_DIR/work" \
    --clean \
    --noconfirm

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
