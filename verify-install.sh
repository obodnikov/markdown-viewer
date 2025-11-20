#!/bin/bash
# Verification script for dependencies

echo "🔍 Verifying Markdown Viewer Dependencies..."
echo ""

# Check Python version
echo "1. Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1)
if [[ $? -eq 0 ]]; then
    echo "   ✅ $PYTHON_VERSION"
else
    echo "   ❌ Python 3 not found"
    exit 1
fi

# Check pandoc
echo "2. Checking pandoc..."
PANDOC_VERSION=$(pandoc --version 2>&1 | head -n 1)
if [[ $? -eq 0 ]]; then
    echo "   ✅ $PANDOC_VERSION"
else
    echo "   ⚠️  pandoc not found (required for PDF/DOCX export)"
    echo "      Install: brew install pandoc (macOS) or apt-get install pandoc (Linux)"
fi

# Check .env file
echo "3. Checking .env configuration..."
if [ -f .env ]; then
    echo "   ✅ .env file exists"

    # Check for API key
    if grep -q "OPENROUTER_API_KEY=sk-or" .env; then
        echo "   ✅ OpenRouter API key configured"
    else
        echo "   ⚠️  OpenRouter API key not set in .env"
        echo "      Get your key from: https://openrouter.ai/settings/keys"
    fi
else
    echo "   ❌ .env file not found"
    echo "      Run: cp .env.example .env"
    exit 1
fi

# Check if venv exists
echo "4. Checking virtual environment..."
if [ -d "venv" ]; then
    echo "   ✅ Virtual environment exists"
else
    echo "   ℹ️  Virtual environment not found (will be created)"
fi

# Try to install and verify Python packages
echo "5. Checking Python packages..."
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "   Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

echo "   Installing packages from requirements.txt..."
pip install -q -r backend/requirements.txt

if [[ $? -eq 0 ]]; then
    echo "   ✅ All Python packages installed successfully"

    # Verify critical imports
    python3 << EOF
try:
    import flask
    import openrouter
    import github
    print("   ✅ Critical imports verified (Flask, OpenRouter, PyGithub)")
except ImportError as e:
    print(f"   ❌ Import failed: {e}")
    exit(1)
EOF
else
    echo "   ❌ Package installation failed"
    echo "      Check backend/requirements.txt for issues"
    exit 1
fi

echo ""
echo "🎉 All checks passed! You're ready to run the application."
echo ""
echo "Next steps:"
echo "  • Docker:  docker-compose up -d"
echo "  • Manual:  ./run-dev.sh"
echo ""
