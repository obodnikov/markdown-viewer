"""Flask application for markdown viewer backend."""
import sys
import os
import logging
from logging.handlers import RotatingFileHandler

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


def setup_logging(app, config_class):
    """
    Configure application logging.

    Args:
        app: Flask application instance
        config_class: Configuration class with LOG_LEVEL and LOG_FORMAT
    """
    # Determine log level
    log_level = getattr(logging, config_class.LOG_LEVEL, logging.INFO)

    # Create formatters
    if config_class.LOG_FORMAT == 'simple':
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:  # detailed
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers = []

    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler (rotating log file) - optional
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    try:
        # Create logs directory if it doesn't exist
        if not os.path.exists(logs_dir):
            os.makedirs(logs_dir)

        # Always create file handler (not just on first run)
        file_handler = RotatingFileHandler(
            os.path.join(logs_dir, 'app.log'),
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    except (OSError, PermissionError) as e:
        # If we can't create logs directory (e.g., in Docker), just log to console
        app.logger.warning(f"Could not create log file: {e}. Logging to console only.")

    # Set Flask app logger
    app.logger.setLevel(log_level)

    # Reduce noise from third-party libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)

    app.logger.info(f"Logging configured: level={config_class.LOG_LEVEL}, format={config_class.LOG_FORMAT}")


def create_app(config_class=Config):
    """Create and configure Flask application.

    Args:
        config_class: Configuration class to use

    Returns:
        Configured Flask app
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Setup logging
    setup_logging(app, config_class)

    # Enable CORS with proper preflight support
    CORS(app,
         origins=config_class.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    # Register blueprints
    app.logger.info("Registering blueprints...")
    app.register_blueprint(llm_bp)
    app.register_blueprint(github_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(bookstack_bp)
    app.logger.info("All blueprints registered successfully")

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

    app = create_app()

    app.logger.info("=" * 60)
    app.logger.info("🚀 Starting Markdown Viewer Backend")
    app.logger.info(f"   Host: {host}")
    app.logger.info(f"   Port: {port}")
    app.logger.info(f"   Debug: {debug}")
    app.logger.info(f"   Log Level: {Config.LOG_LEVEL}")
    app.logger.info(f"   BookStack URL: {Config.BOOKSTACK_URL or 'Not configured'}")
    app.logger.info(f"   URL: http://localhost:{port}")
    app.logger.info("=" * 60)

    app.run(host=host, port=port, debug=debug)
