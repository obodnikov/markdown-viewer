"""Document export routes."""
from flask import Blueprint, request, jsonify, send_file
import io

try:
    from backend.services.export_service import ExportService
    from backend.config import Config
except ImportError:
    from services.export_service import ExportService
    from config import Config

export_bp = Blueprint('export', __name__, url_prefix='/api/export')


def get_export_service() -> ExportService:
    """Get export service instance."""
    return ExportService(
        pandoc_path=Config.PANDOC_PATH,
        pdf_engine=Config.PDF_ENGINE,
        rsvg_convert_path=Config.RSVG_CONVERT_PATH,
        main_font=Config.PDF_MAIN_FONT,
        mono_font=Config.PDF_MONO_FONT
    )


@export_bp.route('/html', methods=['POST'])
def export_html():
    """Export markdown to HTML.

    Request JSON:
        {
            "content": "markdown text",
            "options": {
                "standalone": true,
                "css": "styles.css",
                "toc": false
            }
        }

    Returns:
        {
            "success": true,
            "html": "..."
        }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        content = data.get('content')
        options = data.get('options', {})

        if not content:
            return jsonify({'error': 'content is required'}), 400

        service = get_export_service()
        html = service.to_html(content, options)

        return jsonify({
            'success': True,
            'html': html
        })

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@export_bp.route('/pdf', methods=['POST'])
def export_pdf():
    """Export markdown to PDF.

    Request JSON:
        {
            "content": "markdown text",
            "filename": "document.pdf",
            "options": {
                "paper_size": "A4",
                "margin": "1in",
                "toc": false
            }
        }

    Returns:
        PDF file download. X-Export-Missing-Characters and X-Export-Skipped-Images
        report content that could not be included, when there is any.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        content = data.get('content')
        filename = data.get('filename', 'document.pdf')
        options = data.get('options', {})

        if not content:
            return jsonify({'error': 'content is required'}), 400

        service = get_export_service()
        result = service.to_pdf(content, options)

        response = send_file(
            io.BytesIO(result.content),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        if result.missing_characters:
            response.headers['X-Export-Missing-Characters'] = str(result.missing_characters)
        if result.skipped_images:
            response.headers['X-Export-Skipped-Images'] = str(result.skipped_images)

        return response

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@export_bp.route('/docx', methods=['POST'])
def export_docx():
    """Export markdown to DOCX.

    Request JSON:
        {
            "content": "markdown text",
            "filename": "document.docx",
            "options": {
                "toc": false
            }
        }

    Returns:
        DOCX file download
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        content = data.get('content')
        filename = data.get('filename', 'document.docx')
        options = data.get('options', {})

        if not content:
            return jsonify({'error': 'content is required'}), 400

        service = get_export_service()
        docx_bytes = service.to_docx(content, options)

        return send_file(
            io.BytesIO(docx_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=filename
        )

    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
