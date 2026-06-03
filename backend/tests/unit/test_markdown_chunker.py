"""Tests for the markdown chunker service."""
import pytest

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.markdown_chunker import (
    chunk_markdown,
    _estimate_words,
    _split_at_headings,
    _split_at_paragraphs,
    _get_overlap_context,
)


class TestEstimateWords:
    """Test word counting."""

    def test_simple_text(self):
        assert _estimate_words("hello world foo bar") == 4

    def test_empty_string(self):
        assert _estimate_words("") == 0

    def test_multiline(self):
        assert _estimate_words("line one\nline two\nline three") == 6


class TestSplitAtHeadings:
    """Test heading-based splitting."""

    def test_no_headings(self):
        content = "Just a paragraph.\n\nAnother paragraph."
        result = _split_at_headings(content)
        assert len(result) == 1
        assert result[0] == content

    def test_h2_headings(self):
        content = "# Title\n\nIntro text.\n\n## Section 1\n\nContent 1.\n\n## Section 2\n\nContent 2."
        result = _split_at_headings(content)
        assert len(result) == 3  # preamble + 2 sections
        assert "# Title" in result[0]
        assert "## Section 1" in result[1]
        assert "## Section 2" in result[2]

    def test_does_not_split_at_h1(self):
        content = "# Title 1\n\nContent.\n\n# Title 2\n\nMore content."
        result = _split_at_headings(content)
        # h1 is not a split point
        assert len(result) == 1

    def test_h3_headings(self):
        content = "## Main\n\nIntro.\n\n### Sub 1\n\nContent 1.\n\n### Sub 2\n\nContent 2."
        result = _split_at_headings(content)
        assert len(result) == 3


class TestSplitAtParagraphs:
    """Test paragraph-based splitting."""

    def test_double_newline_split(self):
        content = "Para 1.\n\nPara 2.\n\nPara 3."
        result = _split_at_paragraphs(content)
        assert len(result) == 3

    def test_multiple_newlines(self):
        content = "Para 1.\n\n\n\nPara 2."
        result = _split_at_paragraphs(content)
        assert len(result) == 2

    def test_single_paragraph(self):
        content = "Just one paragraph with no breaks."
        result = _split_at_paragraphs(content)
        assert len(result) == 1


class TestGetOverlapContext:
    """Test overlap context extraction."""

    def test_returns_last_paragraph(self):
        content = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        result = _get_overlap_context(content, max_words=10)
        assert "Third paragraph" in result

    def test_empty_content(self):
        assert _get_overlap_context("") == ""

    def test_respects_max_words(self):
        content = "Short.\n\n" + " ".join(["word"] * 200)
        result = _get_overlap_context(content, max_words=50)
        words = len(result.split())
        assert words <= 50

    def test_oversized_single_paragraph_capped(self):
        """A single trailing paragraph exceeding max_words should be truncated."""
        long_para = " ".join(["longword"] * 500)
        content = f"First paragraph.\n\n{long_para}"
        result = _get_overlap_context(content, max_words=80)
        words = len(result.split())
        assert words <= 80


class TestChunkMarkdown:
    """Test the main chunking function."""

    def test_small_content_not_chunked(self):
        content = "# Hello\n\nShort document."
        result = chunk_markdown(content, target_words=2000)
        assert result.was_chunked is False
        assert len(result.chunks) == 1
        assert result.chunks[0].content == content

    def test_large_content_is_chunked(self):
        # Generate content with multiple sections, each ~500 words
        sections = []
        for i in range(10):
            section = f"## Section {i}\n\n" + " ".join(["word"] * 500)
            sections.append(section)
        content = "\n\n".join(sections)

        result = chunk_markdown(content, target_words=1500)
        assert result.was_chunked is True
        assert len(result.chunks) > 1

    def test_chunks_have_overlap_context(self):
        sections = []
        for i in range(5):
            section = f"## Section {i}\n\n" + " ".join(["word"] * 800)
            sections.append(section)
        content = "\n\n".join(sections)

        result = chunk_markdown(content, target_words=1000, overlap_words=50)
        # First chunk has no overlap
        assert result.chunks[0].overlap_context == ""
        # Subsequent chunks should have overlap
        for chunk in result.chunks[1:]:
            assert chunk.overlap_context != ""

    def test_preserves_all_content(self):
        """All original content should be present across chunks."""
        sections = []
        for i in range(5):
            section = f"## Section {i}\n\nUnique content marker_{i} here."
            sections.append(section)
        content = "\n\n".join(sections)

        result = chunk_markdown(content, target_words=50)
        all_chunk_content = " ".join(c.content for c in result.chunks)

        for i in range(5):
            assert f"marker_{i}" in all_chunk_content

    def test_chunk_indexes_are_sequential(self):
        content = "\n\n".join(
            f"## Section {i}\n\n" + " ".join(["word"] * 300)
            for i in range(10)
        )
        result = chunk_markdown(content, target_words=500)
        for i, chunk in enumerate(result.chunks):
            assert chunk.index == i

    def test_total_words_is_accurate(self):
        content = " ".join(["word"] * 100)
        result = chunk_markdown(content, target_words=2000)
        assert result.total_words == 100

    def test_does_not_split_mid_paragraph(self):
        """A single long paragraph should stay together even if over target."""
        long_para = " ".join(["word"] * 3000)
        content = f"## Title\n\n{long_para}"
        result = chunk_markdown(content, target_words=1000)
        # The long paragraph should be in one chunk (can't split it)
        found = False
        for chunk in result.chunks:
            if "word" in chunk.content and len(chunk.content.split()) > 2500:
                found = True
        assert found

    def test_headings_inside_code_fences_not_split(self):
        """Headings inside fenced code blocks should not cause splits."""
        content = (
            "## Real Section\n\n"
            "Some intro text.\n\n"
            "```markdown\n"
            "## This is inside a code block\n"
            "### Also inside\n"
            "```\n\n"
            "More content after the code block.\n\n"
            "## Another Real Section\n\n"
            "Final content."
        )
        result = chunk_markdown(content, target_words=5000)
        # Should only split at the two real headings, not the ones in the fence
        sections = _split_at_headings(content)
        assert len(sections) == 2  # "## Real Section..." and "## Another Real Section..."
        # Verify the code block content is intact in the first section
        assert "## This is inside a code block" in sections[0]

    def test_code_fence_not_split_at_blank_lines(self):
        """Fenced code blocks with blank lines inside should not be split."""
        content = (
            "## Section\n\n"
            "Intro paragraph.\n\n"
            "```python\n"
            "def foo():\n"
            "    pass\n"
            "\n\n"
            "def bar():\n"
            "    pass\n"
            "```\n\n"
            "After code."
        )
        paragraphs = _split_at_paragraphs(content)
        # The code block should be in one paragraph, not split at the blank line inside
        code_found = False
        for para in paragraphs:
            if "def foo" in para and "def bar" in para:
                code_found = True
        assert code_found, "Code block was split at internal blank line"

    def test_large_section_with_code_fence_stays_intact(self):
        """A large fenced code block should not be split even if over target."""
        code_lines = "\n".join([f"line_{i} = {i}" for i in range(200)])
        content = f"## Code Section\n\n```python\n{code_lines}\n```\n\nAfter code."
        result = chunk_markdown(content, target_words=100)
        # The code block should remain intact in one chunk
        found_intact = False
        for chunk in result.chunks:
            if "line_0" in chunk.content and "line_199" in chunk.content:
                found_intact = True
        assert found_intact, "Code block was split across chunks"

    def test_whitespace_preservation_in_paragraphs(self):
        """Paragraph splitting should preserve leading/trailing spaces."""
        content = "  indented paragraph\n\nnormal paragraph\n\n  another indented"
        paragraphs = _split_at_paragraphs(content)
        assert paragraphs[0] == "  indented paragraph"
        assert paragraphs[2] == "  another indented"
