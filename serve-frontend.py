#!/usr/bin/env python3
"""
Simple HTTP server for the frontend.
Serves files from project root to allow access to all static assets.
Usage: python3 serve-frontend.py [--port 8000]
"""
import sys
import os
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial


class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom handler that serves from project root."""

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Redirect root to /public/index.html
        if self.path == '/':
            self.path = '/public/index.html'
        return super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Markdown Viewer Frontend Server')
    parser.add_argument('--port', type=int, default=8000,
                       help='Port to bind to (default: 8000)')
    parser.add_argument('--host', default='0.0.0.0',
                       help='Host to bind to (default: 0.0.0.0)')
    args = parser.parse_args()

    # Get project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))

    # Create handler bound to project root
    handler = partial(CustomHTTPRequestHandler, directory=project_root)

    # Create server
    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, handler)

    print("✅ Frontend Server Starting")
    print(f"   Host: {args.host}")
    print(f"   Port: {args.port}")
    print(f"   Directory: {project_root}")
    print(f"   URL: http://localhost:{args.port}")
    print("📝 Press Ctrl+C to stop\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down frontend server...")
        httpd.shutdown()
        sys.exit(0)
