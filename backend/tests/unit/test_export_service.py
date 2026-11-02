"""
Unit tests for Export service.
"""
import base64
import logging
import os
import shutil
import stat
import subprocess
from unittest.mock import patch

import pytest

from services.export_service import ExportService, PdfResult, IMAGE_FILTER_PATH


def completed(stdout=b'', stderr=b''):
    """Build the result of a pandoc run that succeeded."""
    return subprocess.CompletedProcess(args=[], returncode=0, stdout=stdout, stderr=stderr)


def failed(returncode, stderr):
    """Build the error raised by a pandoc run that failed."""
    return subprocess.CalledProcessError(returncode, 'pandoc', stderr=stderr.encode('utf-8'))


def pandoc_command(mock_run):
    """Return the arguments of the last pandoc run."""
    return mock_run.call_args[0][0]


def option_value(command, option):
    """Return the value that follows an option in a command."""
    return command[command.index(option) + 1]


@pytest.fixture
def mock_run():
    """Replace pandoc runs with a mock."""
    with patch('services.export_service.subprocess.run') as mock:
        mock.return_value = completed()
        yield mock


@pytest.fixture
def export_service(mock_run):
    """Create ExportService instance with default settings."""
    return ExportService()


class TestPandocCheck:
    """Test cases for the pandoc check at startup."""

    def test_runs_configured_pandoc(self, mock_run):
        ExportService(pandoc_path='/opt/pandoc')
        assert pandoc_command(mock_run) == ['/opt/pandoc', '--version']

    @pytest.mark.parametrize('error', [
        FileNotFoundError('pandoc'),
        PermissionError(13, 'Permission denied', ''),
        subprocess.CalledProcessError(1, 'pandoc'),
    ])
    def test_reports_unusable_pandoc(self, mock_run, error):
        mock_run.side_effect = error
        with pytest.raises(RuntimeError, match='pandoc not found'):
            ExportService(pandoc_path='')


class TestToPdf:
    """Test cases for PDF export."""

    def test_returns_pdf_content(self, export_service, mock_run):
        mock_run.return_value = completed(stdout=b'%PDF-1.7')

        result = export_service.to_pdf('# Test')

        assert result == PdfResult(b'%PDF-1.7', 0, 0)
        assert mock_run.call_args[1]['input'] == '# Test'.encode('utf-8')

    def test_uses_gfm_input_and_xelatex_by_default(self, export_service, mock_run):
        export_service.to_pdf('# Test')

        command = pandoc_command(mock_run)
        assert '--from=gfm' in command
        assert '--to=pdf' in command
        assert option_value(command, '--pdf-engine') == 'xelatex'

    def test_uses_configured_engine(self, mock_run):
        service = ExportService(pdf_engine='/opt/tex/bin/xelatex')

        service.to_pdf('# Test')

        assert option_value(pandoc_command(mock_run), '--pdf-engine') == '/opt/tex/bin/xelatex'

    def test_request_option_overrides_configured_engine(self, mock_run):
        service = ExportService(pdf_engine='/opt/tex/bin/xelatex')

        service.to_pdf('# Test', {'pdf_engine': 'lualatex'})

        assert option_value(pandoc_command(mock_run), '--pdf-engine') == 'lualatex'

    def test_applies_page_options(self, export_service, mock_run):
        export_service.to_pdf('# Test', {'paper_size': 'Letter', 'margin': '2cm', 'toc': True})

        command = pandoc_command(mock_run)
        assert 'papersize=Letter' in command
        assert 'margin-top=2cm' in command
        assert '--toc' in command

    def test_adds_image_filter_and_tells_it_the_converter(self, mock_run):
        service = ExportService(rsvg_convert_path='/opt/bin/rsvg-convert')

        service.to_pdf('# Test')

        assert option_value(pandoc_command(mock_run), '--lua-filter') == IMAGE_FILTER_PATH
        assert mock_run.call_args[1]['env']['RSVG_CONVERT_PATH'] == '/opt/bin/rsvg-convert'

    def test_image_filter_file_exists(self):
        assert os.path.isfile(IMAGE_FILTER_PATH)

    def test_adds_configured_fonts(self, mock_run):
        service = ExportService(main_font='Times New Roman', mono_font='Menlo')

        service.to_pdf('# Test')

        command = pandoc_command(mock_run)
        assert 'mainfont=Times New Roman' in command
        assert 'monofont=Menlo' in command

    def test_leaves_fonts_out_when_not_configured(self, export_service, mock_run):
        export_service.to_pdf('# Test')

        command = pandoc_command(mock_run)
        assert not any(arg.startswith(('mainfont=', 'monofont=')) for arg in command)


class TestPdfWarnings:
    """Test cases for content that could not be included in a PDF."""

    def test_counts_each_missing_character_once(self, export_service, mock_run):
        mock_run.return_value = completed(stderr=(
            '[WARNING] Missing character: There is no 日 (U+65E5) (U+65E5) in font [a]\n'
            '[WARNING] Missing character: There is no 日 (U+65E5) (U+65E5) in font [b]\n'
            '[WARNING] Missing character: There is no 本 (U+672C) in font [a]\n'
        ).encode('utf-8'))

        assert export_service.to_pdf('日本').missing_characters == 2

    def test_counts_skipped_images(self, export_service, mock_run):
        mock_run.return_value = completed(stderr=(
            '[WARNING] Could not fetch resource a.png: not found\n'
            '    host = "example.com"\n'
            '[WARNING] Could not convert image b.gif: bad data\n'
            '[WARNING] SVG image not converted: c.svg\n'
            '[WARNING] Image not usable: d.webp\n'
            '[WARNING] Something unrelated\n'
        ).encode('utf-8'))

        assert export_service.to_pdf('# Test').skipped_images == 4

    def test_no_warnings_mean_nothing_is_missing(self, export_service, mock_run):
        result = export_service.to_pdf('# Test')

        assert result.missing_characters == 0
        assert result.skipped_images == 0

    def test_logs_what_was_left_out(self, export_service, mock_run, caplog):
        mock_run.return_value = completed(stderr=(
            '[WARNING] Missing character: There is no 日 (U+65E5) in font [a]\n'
            '[WARNING] SVG image not converted: c.svg\n'
        ).encode('utf-8'))

        with caplog.at_level(logging.WARNING):
            export_service.to_pdf('# Test')

        assert '日' in caplog.text
        assert 'c.svg' in caplog.text

    def test_tolerates_undecodable_warnings(self, export_service, mock_run):
        mock_run.return_value = completed(stdout=b'%PDF', stderr=b'\xff\xfe')

        assert export_service.to_pdf('# Test').content == b'%PDF'


class TestPdfErrors:
    """Test cases for PDF conversion failures."""

    def test_explains_missing_engine(self, mock_run):
        service = ExportService(pdf_engine='xelatex')
        mock_run.side_effect = failed(47, "'xelatex' not found.")

        with pytest.raises(RuntimeError) as error:
            service.to_pdf('# Test')

        assert "PDF engine 'xelatex' not found" in str(error.value)
        assert 'Settings → PDF Export' in str(error.value)
        assert 'PDF_ENGINE' in str(error.value)

    def test_explains_missing_font(self, export_service, mock_run):
        mock_run.side_effect = failed(43, (
            'Error producing PDF.\n! Package fontspec Error: \n'
            '(fontspec)                The font "No Such Font" cannot be found; this may\n'
            '(fontspec)                be but usually is not a fontspec bug.\n\n'
            'For immediate help type H <return>.\n'
        ))

        with pytest.raises(RuntimeError) as error:
            export_service.to_pdf('# Test')

        message = str(error.value)
        assert 'PDF font "No Such Font" not found' in message
        assert 'Main Font and Code Font' in message
        assert 'For immediate help' not in message

    def test_finds_font_name_in_wrapped_lines(self, export_service, mock_run):
        mock_run.side_effect = failed(43, (
            '! Package fontspec Error: \n'
            '(fontspec)                The font "A Very Long Font Name" cannot\n'
            '(fontspec)                be found; this may be a bug.\n'
        ))

        with pytest.raises(RuntimeError, match='PDF font "A Very Long Font Name" not found'):
            export_service.to_pdf('# Test')

    def test_passes_other_errors_through(self, export_service, mock_run):
        mock_run.side_effect = failed(43, '! LaTeX Error: File `soul.sty` not found.')

        with pytest.raises(RuntimeError, match='PDF conversion failed: ! LaTeX Error: File `soul.sty`'):
            export_service.to_pdf('# Test')


class TestOtherFormats:
    """Test cases for HTML, DOCX and markdown output."""

    def test_to_html_basic(self, export_service, mock_run):
        mock_run.return_value = completed(stdout='<h1>Тест</h1>'.encode('utf-8'))

        assert export_service.to_html('# Тест') == '<h1>Тест</h1>'

        command = pandoc_command(mock_run)
        assert '--from=gfm' in command
        assert '--to=html5' in command

    def test_to_html_with_options(self, export_service, mock_run):
        export_service.to_html('# Test', {'standalone': True, 'toc': True, 'css': 'style.css'})

        command = pandoc_command(mock_run)
        assert '--standalone' in command
        assert '--toc' in command
        assert option_value(command, '--css') == 'style.css'

    def test_to_html_error(self, export_service, mock_run):
        mock_run.side_effect = failed(1, 'bad input')

        with pytest.raises(RuntimeError, match='HTML conversion failed: bad input'):
            export_service.to_html('# Test')

    def test_to_docx_basic(self, export_service, mock_run):
        mock_run.return_value = completed(stdout=b'PK\x03\x04')

        assert export_service.to_docx('# Test') == b'PK\x03\x04'
        assert '--to=docx' in pandoc_command(mock_run)

    def test_to_docx_with_options(self, export_service, mock_run):
        export_service.to_docx('# Test', {'reference_doc': 'template.docx', 'toc': True})

        command = pandoc_command(mock_run)
        assert option_value(command, '--reference-doc') == 'template.docx'
        assert '--toc' in command

    def test_to_docx_error(self, export_service, mock_run):
        mock_run.side_effect = failed(1, 'bad input')

        with pytest.raises(RuntimeError, match='DOCX conversion failed: bad input'):
            export_service.to_docx('# Test')

    def test_markdown_to_markdown(self, export_service, mock_run):
        mock_run.return_value = completed(stdout=b'# Normalized\n')

        assert export_service.markdown_to_markdown('# Test') == '# Normalized\n'

        command = pandoc_command(mock_run)
        assert '--from=gfm' in command
        assert '--to=gfm' in command

    def test_markdown_to_markdown_error(self, export_service, mock_run):
        mock_run.side_effect = failed(1, 'bad input')

        with pytest.raises(RuntimeError, match='Markdown normalization failed: bad input'):
            export_service.markdown_to_markdown('# Test')


@pytest.mark.skipif(shutil.which('pandoc') is None, reason='pandoc is not installed')
class TestImageFilter:
    """Test the image filter with real pandoc and a fake converter; no LaTeX needed."""

    SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'

    def run_filter(self, tmp_path, markdown, converter):
        """Run pandoc with the filter and return its document structure and warnings."""
        return subprocess.run(
            ['pandoc', '--from=gfm', '--to=native', '--lua-filter', IMAGE_FILTER_PATH],
            input=markdown.encode('utf-8'),
            capture_output=True,
            check=True,
            cwd=tmp_path,
            env={**os.environ, 'RSVG_CONVERT_PATH': converter}
        )

    def make_converter(self, tmp_path):
        """Create a fake converter that always succeeds."""
        converter = tmp_path / 'fake-rsvg-convert'
        converter.write_text('#!/bin/sh\nprintf "%%PDF-fake"\n')
        converter.chmod(converter.stat().st_mode | stat.S_IEXEC)
        return str(converter)

    def test_replaces_svg_with_converted_pdf(self, tmp_path):
        (tmp_path / 'pic.svg').write_text(self.SVG)

        result = self.run_filter(tmp_path, '![alt](pic.svg)', self.make_converter(tmp_path))

        output = result.stdout.decode('utf-8')
        assert '.pdf"' in output
        assert 'pic.svg' not in output
        assert result.stderr == b''

    def test_recognizes_svg_by_type_with_parameters(self, tmp_path):
        encoded = base64.b64encode(self.SVG.encode('utf-8')).decode('ascii')
        source = f'data:image/svg+xml;charset=utf-8;base64,{encoded}'

        result = self.run_filter(tmp_path, f'![alt]({source})', self.make_converter(tmp_path))

        output = result.stdout.decode('utf-8')
        assert '.pdf"' in output
        assert source not in output

    def test_describes_image_when_converter_is_missing(self, tmp_path):
        (tmp_path / 'pic.svg').write_text(self.SVG)

        result = self.run_filter(tmp_path, '![a picture](pic.svg)', str(tmp_path / 'no-such-tool'))

        assert 'SVG image: a picture' in result.stdout.decode('utf-8')
        assert b'[WARNING] SVG image not converted: pic.svg' in result.stderr

    def test_leaves_other_images_alone(self, tmp_path):
        (tmp_path / 'pic.png').write_bytes(b'\x89PNG')

        result = self.run_filter(tmp_path, '![alt](pic.png)', self.make_converter(tmp_path))

        assert 'pic.png' in result.stdout.decode('utf-8')

    @pytest.mark.parametrize('mime_type', ['text/html', 'text/html;charset=utf-8', 'image/webp'])
    def test_describes_image_that_cannot_be_used(self, tmp_path, mime_type):
        source = f'data:{mime_type};base64,PGh0bWw+'

        result = self.run_filter(tmp_path, f'![a picture]({source})', self.make_converter(tmp_path))

        assert 'Image: a picture' in result.stdout.decode('utf-8')
        assert source not in result.stdout.decode('utf-8')
        assert b'[WARNING] Image not usable: data:' in result.stderr

    def test_leaves_unavailable_images_to_pandoc(self, tmp_path):
        result = self.run_filter(tmp_path, '![alt](missing.svg)', self.make_converter(tmp_path))

        assert 'missing.svg' in result.stdout.decode('utf-8')
