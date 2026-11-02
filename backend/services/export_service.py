"""Document export service using pandoc.

Unicode Support:
- PDF: Uses XeLaTeX engine by default; text only shows if the configured font has it
- DOCX: Native Unicode support through Office Open XML format
- HTML: Full Unicode support through UTF-8 encoding
"""
import logging
import re
import subprocess
import tempfile
import os
from dataclasses import dataclass
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# pandoc's exit code when the PDF engine cannot be run
PDF_ENGINE_NOT_FOUND_EXIT_CODE = 47

IMAGE_FILTER_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'pandoc_filters', 'prepare_images.lua'
)

FONT_NOT_FOUND_PATTERN = re.compile(r'The font "([^"]+)" cannot be found')
MISSING_CHARACTER_PATTERN = re.compile(r'Missing character: There is no (\S+)')

# pandoc warnings that mean an image was left out of the PDF
SKIPPED_IMAGE_WARNINGS = (
    '[WARNING] Could not fetch resource',
    '[WARNING] Could not convert image',
    '[WARNING] SVG image not converted',
    '[WARNING] Image not usable',
)


@dataclass
class PdfResult:
    """A generated PDF and how much content could not be included in it."""

    content: bytes
    missing_characters: int = 0
    skipped_images: int = 0


class ExportService:
    """Service for exporting markdown to various formats with full Unicode support."""

    def __init__(
        self,
        pandoc_path: str = 'pandoc',
        pdf_engine: str = 'xelatex',
        rsvg_convert_path: str = 'rsvg-convert',
        main_font: str = '',
        mono_font: str = ''
    ):
        """Initialize export service.

        Args:
            pandoc_path: Path to pandoc executable
            pdf_engine: Name or full path of the PDF engine
            rsvg_convert_path: Path to the SVG converter used for PDF export
            main_font: PDF text font; empty keeps pandoc's default (no Cyrillic)
            mono_font: PDF code font; empty keeps pandoc's default (no Cyrillic)
        """
        self.pandoc_path = pandoc_path
        self.pdf_engine = pdf_engine
        self.rsvg_convert_path = rsvg_convert_path
        self.main_font = main_font
        self.mono_font = mono_font
        self._verify_pandoc()

    def _verify_pandoc(self):
        """Verify pandoc is available."""
        try:
            subprocess.run(
                [self.pandoc_path, '--version'],
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, OSError):
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
    ) -> PdfResult:
        """Convert markdown to PDF.

        Args:
            markdown_content: Markdown content
            options: Conversion options (paper_size, margin, pdf_engine, etc.)

        Returns:
            PDF content and how much content could not be included
        """
        options = options or {}

        cmd = [
            self.pandoc_path,
            '--from=gfm',
            '--to=pdf',
        ]

        # PDF Engine - use XeLaTeX for Unicode support (default)
        pdf_engine = options.get('pdf_engine', self.pdf_engine)
        cmd.extend(['--pdf-engine', pdf_engine])

        # Images have to be prepared before LaTeX sees them
        cmd.extend(['--lua-filter', IMAGE_FILTER_PATH])

        # Fonts
        if self.main_font:
            cmd.extend(['-V', f'mainfont={self.main_font}'])
        if self.mono_font:
            cmd.extend(['-V', f'monofont={self.mono_font}'])

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
                check=True,
                env={**os.environ, 'RSVG_CONVERT_PATH': self.rsvg_convert_path}
            )
            return self._build_pdf_result(result.stdout, result.stderr.decode('utf-8', 'replace'))

        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                self._describe_pdf_error(e.returncode, e.stderr.decode('utf-8', 'replace'), pdf_engine)
            )

    def _build_pdf_result(self, content: bytes, stderr: str) -> PdfResult:
        """Count and log the content pandoc reports as left out of the PDF.

        Args:
            content: Generated PDF
            stderr: pandoc's warnings

        Returns:
            PDF content with the counts of missing characters and skipped images
        """
        missing_characters = set(MISSING_CHARACTER_PATTERN.findall(stderr))
        skipped_images = [
            line for line in stderr.splitlines() if line.startswith(SKIPPED_IMAGE_WARNINGS)
        ]

        if missing_characters:
            logger.warning(
                'PDF export: characters missing from the font: %s',
                ' '.join(sorted(missing_characters))
            )
        for line in skipped_images:
            logger.warning('PDF export: %s', line[:200])

        return PdfResult(content, len(missing_characters), len(skipped_images))

    def _describe_pdf_error(self, returncode: int, stderr: str, pdf_engine: str) -> str:
        """Turn a failed PDF conversion into a message the user can act on.

        Args:
            returncode: pandoc's exit code
            stderr: pandoc's error output
            pdf_engine: PDF engine that was requested

        Returns:
            Error message
        """
        if returncode == PDF_ENGINE_NOT_FOUND_EXIT_CODE:
            return (
                f"PDF engine '{pdf_engine}' not found. Install XeLaTeX (TeX Live or MacTeX) "
                "and set its path in Settings → PDF Export (desktop app) "
                "or in PDF_ENGINE (web version)."
            )

        # LaTeX wraps long lines and marks each one, so join them before searching
        font_error = FONT_NOT_FOUND_PATTERN.search(
            ' '.join(stderr.replace('(fontspec)', ' ').split())
        )
        if font_error:
            return (
                f'PDF font "{font_error.group(1)}" not found. Check Main Font and Code Font '
                'in Settings → PDF Export (desktop app) '
                'or PDF_MAIN_FONT and PDF_MONO_FONT (web version).'
            )

        return f"PDF conversion failed: {stderr}"

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
