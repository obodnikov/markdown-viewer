#!/usr/bin/env python3
"""
Simple Python script to start the Flask backend.
Usage:
  python3 start.py
  python3 start.py --port 3000
  python3 start.py --host 127.0.0.1 --port 8080 --debug
"""
import sys
import os
import argparse

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Import and run the app
from backend.app import create_app, Config

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Markdown Viewer Backend Server',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 start.py                    # Start on default port (5000)
  python3 start.py --port 3000        # Start on port 3000
  python3 start.py --debug            # Start in debug mode
  python3 start.py --host 127.0.0.1   # Bind to localhost only

Environment variables can also be used:
  BACKEND_PORT=3000 python3 start.py
  BACKEND_HOST=127.0.0.1 python3 start.py
        """
    )
    parser.add_argument('--host', default=None,
                       help='Host to bind to (default: from BACKEND_HOST or 0.0.0.0)')
    parser.add_argument('--port', type=int, default=None,
                       help='Port to bind to (default: from BACKEND_PORT or 5000)')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug mode')
    args = parser.parse_args()

    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("Please set required environment variables in .env file")
        print("\nQuick fix:")
        print("  1. cp .env.example .env")
        print("  2. Edit .env and add your OPENROUTER_API_KEY")
        sys.exit(1)

    # Get host and port (priority: CLI args > env vars > defaults)
    host = args.host or Config.HOST
    port = args.port or Config.PORT
    debug = args.debug or Config.DEBUG

    print("✅ Configuration validated")
    print("🚀 Starting Markdown Viewer Backend")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   URL: http://localhost:{port}")
    print("📝 Press Ctrl+C to stop\n")

    app = create_app()
    app.run(host=host, port=port, debug=debug)
