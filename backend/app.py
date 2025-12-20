"""Flask application for markdown viewer backend."""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify
from flask_cors import CORS

try:
    from backend.config import Config
    from backend.routes.llm import llm_bp
    from backend.routes.github import github_bp
    from backend.routes.export import export_bp
    from backend.routes.bookstack import bookstack_bp
except ImportError:
    from config import Config
    from routes.llm import llm_bp
    from routes.github import github_bp
    from routes.export import export_bp
    from routes.bookstack import bookstack_bp


def create_app(config_class=Config):
    """Create and configure Flask application.

    Args:
        config_class: Configuration class to use

    Returns:
        Configured Flask app
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS with proper preflight support
    CORS(app,
         origins=config_class.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    # Register blueprints
    app.register_blueprint(llm_bp)
    app.register_blueprint(github_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(bookstack_bp)

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'service': 'markdown-viewer-backend'
        })

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors."""
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors."""
        return jsonify({'error': 'Internal server error'}), 500

    return app


if __name__ == '__main__':
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Markdown Viewer Backend')
    parser.add_argument('--host', default=None, help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=None, help='Port to bind to (default: 5000)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"Configuration error: {e}")
        print("Please set required environment variables in .env file")
        exit(1)

    # Get host and port (priority: CLI args > env vars > defaults)
    host = args.host or Config.HOST
    port = args.port or Config.PORT
    debug = args.debug or Config.DEBUG

    print(f"🚀 Starting Markdown Viewer Backend")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   URL: http://localhost:{port}")

    app = create_app()
    app.run(host=host, port=port, debug=debug)
