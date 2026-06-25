#!/usr/bin/env python3
"""Split a manuscript markdown file into one markdown file per chapter."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "astrans.md"
DEFAULT_OUTPUT = ROOT / "manuscript" / "chapters"

TITLE_RE = re.compile(r"^#\s+(.+?)\s*$")
PART_RE = re.compile(r"^#\s+Part\s+([IVXLCDM]+)\s+(.+?)\s*$", re.IGNORECASE)
CHAPTER_RE = re.compile(r"^##\s+\*\*Chapter\s+(\d+):\s*(.+?)\*\*\s*$")
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)


@dataclass
class Chapter:
    number: int
    title: str
    part_number: str
    part_title: str
    lines: list[str]

    @property
    def slug(self) -> str:
        normalized = unicodedata.normalize("NFKD", self.title)
        ascii_title = normalized.encode("ascii", "ignore").decode("ascii")
        clean = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
        return f"{self.number:02d}-{clean}"

    @property
    def word_count(self) -> int:
        return len(WORD_RE.findall("\n".join(self.lines)))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Split the manuscript markdown into per-chapter files."
    )
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Source markdown manuscript.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output directory for chapter markdown files.",
    )
    return parser.parse_args()


def trim_blank_edges(lines: list[str]) -> None:
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()


def parse_book(source: Path) -> tuple[str, list[Chapter]]:
    lines = source.read_text(encoding="utf-8").splitlines()
    title = source.stem
    current_part = ("I", "The Spark")
    chapters: list[Chapter] = []
    current: Chapter | None = None

    for line in lines:
        title_match = TITLE_RE.match(line)
        if title_match and not line.startswith("# Part "):
            value = title_match.group(1).strip()
            if value and value != "#":
                title = value
            continue

        part_match = PART_RE.match(line)
        if part_match:
            current_part = (part_match.group(1), part_match.group(2).strip())
            continue

        chapter_match = CHAPTER_RE.match(line)
        if chapter_match:
            if current is not None:
                trim_blank_edges(current.lines)
                chapters.append(current)
            current = Chapter(
                number=int(chapter_match.group(1)),
                title=chapter_match.group(2).strip(),
                part_number=current_part[0],
                part_title=current_part[1],
                lines=[],
            )
            continue

        if current is not None:
            current.lines.append(line)

    if current is not None:
        trim_blank_edges(current.lines)
        chapters.append(current)

    expected = list(range(1, len(chapters) + 1))
    actual = [chapter.number for chapter in chapters]
    if actual != expected:
        raise ValueError(f"Chapter sequence is not contiguous: {actual}")

    return title, chapters


def render_chapter(book_title: str, chapter: Chapter) -> str:
    parts = [
        f"# {book_title}",
        "",
        f"# Part {chapter.part_number} {chapter.part_title}",
        "",
        f"## **Chapter {chapter.number}: {chapter.title}**",
    ]
    if chapter.lines:
        parts.extend(["", "\n".join(chapter.lines).rstrip()])
    return "\n".join(parts).rstrip() + "\n"


def build_manifest(book_title: str, chapters: list[Chapter]) -> dict[str, object]:
    return {
        "title": book_title,
        "chapterCount": len(chapters),
        "chapters": [
            {
                "number": chapter.number,
                "title": chapter.title,
                "part": chapter.part_number,
                "partTitle": chapter.part_title,
                "slug": chapter.slug,
                "filename": f"{chapter.slug}.md",
                "wordCount": chapter.word_count,
            }
            for chapter in chapters
        ],
    }


def clear_previous_outputs(output: Path) -> None:
    for existing in output.glob("*.md"):
        existing.unlink()
    manifest = output / "manifest.json"
    if manifest.exists():
        manifest.unlink()


def split_book(source: Path, output: Path) -> None:
    book_title, chapters = parse_book(source)
    output.mkdir(parents=True, exist_ok=True)
    clear_previous_outputs(output)

    for chapter in chapters:
        destination = output / f"{chapter.slug}.md"
        destination.write_text(render_chapter(book_title, chapter), encoding="utf-8")

    manifest = build_manifest(book_title, chapters)
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if output.is_relative_to(ROOT):
        label = output.relative_to(ROOT)
    else:
        label = output
    print(f"Split {len(chapters)} chapters into {label}")


def main() -> int:
    args = parse_args()
    split_book(args.source.resolve(), args.output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
