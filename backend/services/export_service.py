"""Document export service using pandoc.

Unicode Support:
- PDF: Uses XeLaTeX engine by default for full Unicode support
- DOCX: Native Unicode support through Office Open XML format
- HTML: Full Unicode support through UTF-8 encoding
"""
import subprocess
import tempfile
import os
from typing import Optional, Dict, Any


class ExportService:
    """Service for exporting markdown to various formats with full Unicode support."""

    def __init__(self, pandoc_path: str = 'pandoc'):
        """Initialize export service.

        Args:
            pandoc_path: Path to pandoc executable
        """
        self.pandoc_path = pandoc_path
        self._verify_pandoc()

    def _verify_pandoc(self):
        """Verify pandoc is available."""
        try:
            subprocess.run(
                [self.pandoc_path, '--version'],
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError(
                "pandoc not found. Please install pandoc: "
                "https://pandoc.org/installing.html"
            )

    def to_html(
        self,
        markdown_content: str,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Convert markdown to HTML.

        Args:
            markdown_content: Markdown content
            options: Conversion options (css, standalone, etc.)

        Returns:
            HTML content
        """
        options = options or {}

        cmd = [
            self.pandoc_path,
            '--from=gfm',  # GitHub Flavored Markdown
            '--to=html5',
        ]

        if options.get('standalone', False):
            cmd.append('--standalone')

        if options.get('css'):
            cmd.extend(['--css', options['css']])

        if options.get('toc', False):
            cmd.append('--toc')

        try:
            result = subprocess.run(
                cmd,
                input=markdown_content.encode('utf-8'),
                capture_output=True,
                check=True
            )
            return result.stdout.decode('utf-8')

        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"HTML conversion failed: {e.stderr.decode('utf-8')}")

    def to_pdf(
        self,
        markdown_content: str,
        options: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Convert markdown to PDF.

        Args:
            markdown_content: Markdown content
            options: Conversion options (paper_size, margin, pdf_engine, etc.)

        Returns:
            PDF content as bytes
        """
        options = options or {}

        cmd = [
            self.pandoc_path,
            '--from=gfm',
            '--to=pdf',
        ]

        # PDF Engine - use XeLaTeX for Unicode support (default)
        pdf_engine = options.get('pdf_engine', 'xelatex')
        cmd.extend(['--pdf-engine', pdf_engine])

        # Paper size
        paper_size = options.get('paper_size', 'A4')
        cmd.extend(['-V', f'papersize={paper_size}'])

        # Margins
        margin = options.get('margin', '1in')
        cmd.extend(['-V', f'margin-top={margin}'])
        cmd.extend(['-V', f'margin-bottom={margin}'])
        cmd.extend(['-V', f'margin-left={margin}'])
        cmd.extend(['-V', f'margin-right={margin}'])

        # TOC
        if options.get('toc', False):
            cmd.append('--toc')

        try:
            result = subprocess.run(
                cmd,
                input=markdown_content.encode('utf-8'),
                capture_output=True,
                check=True
            )
            return result.stdout

        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"PDF conversion failed: {e.stderr.decode('utf-8')}")

    def to_docx(
        self,
        markdown_content: str,
        options: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Convert markdown to DOCX.

        DOCX format natively supports Unicode through Office Open XML,
        so all Unicode characters (including emojis, special symbols,
        non-Latin scripts) are preserved correctly.

        Args:
            markdown_content: Markdown content
            options: Conversion options (reference_doc, etc.)

        Returns:
            DOCX content as bytes
        """
        options = options or {}

        cmd = [
            self.pandoc_path,
            '--from=gfm',
            '--to=docx',
        ]

        # Reference document for styling
        if options.get('reference_doc'):
            cmd.extend(['--reference-doc', options['reference_doc']])

        # TOC
        if options.get('toc', False):
            cmd.append('--toc')

        try:
            result = subprocess.run(
                cmd,
                input=markdown_content.encode('utf-8'),
                capture_output=True,
                check=True
            )
            return result.stdout

        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"DOCX conversion failed: {e.stderr.decode('utf-8')}")

    def markdown_to_markdown(
        self,
        markdown_content: str,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Normalize markdown using pandoc.

        Args:
            markdown_content: Markdown content
            options: Conversion options

        Returns:
            Normalized markdown
        """
        options = options or {}

        cmd = [
            self.pandoc_path,
            '--from=gfm',
            '--to=gfm',
        ]

        try:
            result = subprocess.run(
                cmd,
                input=markdown_content.encode('utf-8'),
                capture_output=True,
                check=True
            )
            return result.stdout.decode('utf-8')

        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Markdown normalization failed: {e.stderr.decode('utf-8')}")
