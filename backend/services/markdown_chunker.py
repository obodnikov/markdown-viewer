"""Markdown-aware text chunker for LLM processing.

Splits large markdown documents into chunks at natural boundaries
(headings, then paragraphs) while preserving structure. Each chunk
includes optional overlap context from the previous chunk for
coherence at boundaries.

Inspired by the ebook-translator project's chunking approach.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import List


# Heading pattern: lines starting with 1-6 # characters
_HEADING_RE = re.compile(r'^(#{1,6})\s+', re.MULTILINE)

# Fenced code block pattern (``` or ~~~)
_FENCE_RE = re.compile(r'^(`{3,}|~{3,})', re.MULTILINE)


def _find_heading_positions(content: str) -> List[int]:
    """Find positions of ## headings that are NOT inside fenced code blocks.

    Tracks code fence open/close state to avoid splitting inside code blocks.
    """
    # First, identify all fenced code block ranges
    fenced_ranges = []
    fence_start = None

    for match in _FENCE_RE.finditer(content):
        if fence_start is None:
            fence_start = match.start()
        else:
            fenced_ranges.append((fence_start, match.end()))
            fence_start = None

    # If there's an unclosed fence, treat everything after it as fenced
    if fence_start is not None:
        fenced_ranges.append((fence_start, len(content)))

    def _is_inside_fence(pos: int) -> bool:
        for start, end in fenced_ranges:
            if start <= pos < end:
                return True
        return False

    # Find headings that are NOT inside code fences
    positions = []
    for match in _HEADING_RE.finditer(content):
        level = len(match.group(1))
        if level >= 2 and not _is_inside_fence(match.start()):
            positions.append(match.start())

    return positions


@dataclass
class Chunk:
    """A single chunk of markdown content."""
    index: int
    content: str
    word_count: int
    overlap_context: str = ""  # Read-only context from previous chunk


@dataclass
class ChunkResult:
    """Result of chunking a markdown document."""
    chunks: List[Chunk]
    total_words: int
    was_chunked: bool  # False if content fit in a single chunk


def _estimate_words(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def _split_at_headings(content: str) -> List[str]:
    """Split markdown content at heading boundaries (## and below).

    Keeps the heading with its following content as one section.
    Top-level content before the first heading is its own section.
    Headings inside fenced code blocks are ignored.
    Preserves original whitespace within sections.
    """
    splits = _find_heading_positions(content)

    if not splits:
        return [content]

    sections = []
    # Content before first heading
    if splits[0] > 0:
        preamble = content[:splits[0]]
        if preamble.strip():  # Only check emptiness, don't mutate
            sections.append(preamble.rstrip('\n'))

    # Each heading + its content
    for i, start in enumerate(splits):
        end = splits[i + 1] if i + 1 < len(splits) else len(content)
        section = content[start:end].rstrip('\n')
        if section.strip():  # Only check emptiness, don't mutate
            sections.append(section)

    return sections


def _split_at_paragraphs(content: str) -> List[str]:
    """Split content at paragraph boundaries (double newlines).

    Fence-aware: treats fenced code blocks as atomic regions and
    never splits within them. Preserves internal whitespace.
    """
    # Identify fenced code block ranges
    fenced_ranges = []
    fence_start = None
    for match in _FENCE_RE.finditer(content):
        if fence_start is None:
            fence_start = match.start()
        else:
            fenced_ranges.append((fence_start, match.end()))
            fence_start = None
    if fence_start is not None:
        fenced_ranges.append((fence_start, len(content)))

    def _is_inside_fence(pos: int) -> bool:
        for start, end in fenced_ranges:
            if start <= pos < end:
                return True
        return False

    # Find split points: positions of double-newlines NOT inside fences
    split_points = []
    for match in re.finditer(r'\n\n+', content):
        if not _is_inside_fence(match.start()):
            split_points.append((match.start(), match.end()))

    if not split_points:
        return [content]

    # Split at those points, preserving exact content between them
    paragraphs = []
    prev_end = 0
    for start, end in split_points:
        segment = content[prev_end:start]
        if segment.strip():
            paragraphs.append(segment)
        prev_end = end

    # Last segment after final split point
    tail = content[prev_end:]
    if tail.strip():
        paragraphs.append(tail)

    return paragraphs


def _merge_small_sections(sections: List[str], target_words: int) -> List[str]:
    """Merge consecutive small sections until they approach target_words."""
    if not sections:
        return []

    merged = []
    current_parts = []
    current_words = 0

    for section in sections:
        section_words = _estimate_words(section)

        # If adding this section would exceed target and we have content, flush
        if current_parts and current_words + section_words > target_words:
            merged.append('\n\n'.join(current_parts))
            current_parts = []
            current_words = 0

        current_parts.append(section)
        current_words += section_words

    # Flush remaining
    if current_parts:
        merged.append('\n\n'.join(current_parts))

    return merged


def _split_large_section(section: str, target_words: int) -> List[str]:
    """Split a section that's too large by paragraph boundaries."""
    paragraphs = _split_at_paragraphs(section)

    if len(paragraphs) <= 1:
        # Can't split further without breaking mid-paragraph
        return [section]

    # Greedy pack paragraphs into chunks
    chunks = []
    current_parts = []
    current_words = 0

    for para in paragraphs:
        para_words = _estimate_words(para)

        if current_parts and current_words + para_words > target_words:
            chunks.append('\n\n'.join(current_parts))
            current_parts = []
            current_words = 0

        current_parts.append(para)
        current_words += para_words

    if current_parts:
        chunks.append('\n\n'.join(current_parts))

    return chunks


def _get_overlap_context(previous_content: str, max_words: int = 100) -> str:
    """Extract the last paragraph(s) from previous chunk as overlap context.

    Enforces a hard cap of max_words even if the trailing paragraph
    is larger. In that case, takes the last max_words words.

    Args:
        previous_content: The full content of the previous chunk.
        max_words: Maximum words to include as context.

    Returns:
        The trailing portion of the previous chunk for context,
        guaranteed to be at most max_words words.
    """
    if not previous_content or not previous_content.strip():
        return ""

    paragraphs = _split_at_paragraphs(previous_content)
    if not paragraphs:
        return ""

    # Take paragraphs from the end until we hit max_words
    context_parts = []
    total_words = 0

    for para in reversed(paragraphs):
        para_words = _estimate_words(para)
        if total_words + para_words > max_words and context_parts:
            break
        context_parts.insert(0, para)
        total_words += para_words

    result = '\n\n'.join(context_parts)

    # Hard cap: if result exceeds max_words (e.g., single oversized paragraph),
    # truncate to the last max_words words.
    result_words = result.split()
    if len(result_words) > max_words:
        result = ' '.join(result_words[-max_words:])

    return result


def chunk_markdown(
    content: str,
    target_words: int = 2000,
    overlap_words: int = 100,
) -> ChunkResult:
    """Split markdown content into chunks suitable for LLM processing.

    Strategy:
    1. Split at heading boundaries (## and below).
    2. Merge small consecutive sections up to target_words.
    3. Split sections that exceed target_words at paragraph boundaries.
    4. Add overlap context from previous chunk for coherence.

    Args:
        content: Full markdown document text.
        target_words: Target word count per chunk (~2000 is safe for most models).
        overlap_words: Words of context to include from previous chunk.

    Returns:
        ChunkResult with list of Chunk objects.
    """
    total_words = _estimate_words(content)

    # If content fits in one chunk, don't split
    if total_words <= target_words:
        return ChunkResult(
            chunks=[Chunk(index=0, content=content, word_count=total_words)],
            total_words=total_words,
            was_chunked=False,
        )

    # Step 1: Split at headings
    sections = _split_at_headings(content)

    # Step 2: Split any oversized sections at paragraph boundaries
    refined_sections = []
    for section in sections:
        if _estimate_words(section) > target_words:
            refined_sections.extend(_split_large_section(section, target_words))
        else:
            refined_sections.append(section)

    # Step 3: Merge small consecutive sections
    merged = _merge_small_sections(refined_sections, target_words)

    # Step 4: Build Chunk objects with overlap context
    chunks = []
    for i, chunk_content in enumerate(merged):
        overlap = ""
        if i > 0:
            overlap = _get_overlap_context(merged[i - 1], overlap_words)

        chunks.append(Chunk(
            index=i,
            content=chunk_content,
            word_count=_estimate_words(chunk_content),
            overlap_context=overlap,
        ))

    return ChunkResult(
        chunks=chunks,
        total_words=total_words,
        was_chunked=True,
    )
