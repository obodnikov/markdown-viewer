#!/bin/bash
# Development startup script

echo "🚀 Starting Markdown Viewer in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env with your API keys before continuing."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -q -r backend/requirements.txt

# Check for pandoc
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  pandoc not found. PDF/DOCX export will not work."
    echo "   Install with: brew install pandoc (macOS) or apt-get install pandoc (Linux)"
fi

# Start backend in background
echo "🐍 Starting Flask backend on port 5000..."
export FLASK_APP=backend/app.py
export FLASK_ENV=development
export DEBUG=true
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python3 backend/app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🌐 Starting frontend server on port 8000..."
python3 serve-frontend.py --port 8000 &
FRONTEND_PID=$!

echo ""
echo "✅ Markdown Viewer is running!"
echo "   Frontend: http://localhost:8000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Trap Ctrl+C and cleanup
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for processes
wait
