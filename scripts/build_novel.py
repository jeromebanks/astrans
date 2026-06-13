#!/usr/bin/env python3
"""Build a dependency-free, chapter-by-chapter HTML edition of astrans.md."""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "astrans.md"
DEFAULT_OUTPUT = ROOT / "novel"

CHAPTER_RE = re.compile(r"^##\s+\*\*Chapter\s+(\d+):\s*(.+?)\*\*\s*$")
PART_RE = re.compile(r"^#\s+Part\s+([IVXLCDM]+)\s+(.+?)\s*$", re.IGNORECASE)
ALIGN_RE = re.compile(r"^:?-{3,}:?$")
SCENE_BREAK_RE = re.compile(r"^(?:\\?\*){3}$")
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
    def filename(self) -> str:
        return f"{self.slug}.html"

    @property
    def word_count(self) -> int:
        return len(WORD_RE.findall("\n".join(self.lines)))

    @property
    def read_minutes(self) -> int:
        return max(1, round(self.word_count / 240))

    @property
    def metadata(self) -> list[tuple[str, str]]:
        for i in range(len(self.lines) - 1):
            if self.lines[i].lstrip().startswith("|") and is_alignment_row(self.lines[i + 1]):
                rows: list[tuple[str, str]] = []
                j = i
                while j < len(self.lines) and self.lines[j].lstrip().startswith("|"):
                    if not is_alignment_row(self.lines[j]):
                        cells = parse_table_row(self.lines[j])
                        if len(cells) >= 2:
                            label = plain_inline(cells[0])
                            value = plain_inline(cells[1])
                            if value:
                                rows.append((label, value))
                    j += 1
                return rows
        return []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def parse_book(source: Path) -> tuple[str, list[Chapter]]:
    lines = source.read_text(encoding="utf-8").splitlines()
    title = "Astrans"
    current_part = ("I", "The Spark")
    chapters: list[Chapter] = []
    current: Chapter | None = None

    for line in lines:
        part = PART_RE.match(line)
        if part:
            current_part = (part.group(1), part.group(2).strip())
            continue

        chapter = CHAPTER_RE.match(line)
        if chapter:
            if current:
                trim_blank_edges(current.lines)
                chapters.append(current)
            current = Chapter(
                number=int(chapter.group(1)),
                title=chapter.group(2).strip(),
                part_number=current_part[0],
                part_title=current_part[1],
                lines=[],
            )
            continue

        if line.startswith("# ") and "Part " not in line and line.strip("# ").strip():
            title = line.strip("# ").strip()
            continue

        if current is not None:
            if line.strip() in {"#", "##"}:
                continue
            current.lines.append(line)

    if current:
        trim_blank_edges(current.lines)
        chapters.append(current)

    expected = list(range(1, len(chapters) + 1))
    actual = [chapter.number for chapter in chapters]
    if actual != expected:
        raise ValueError(f"Chapter sequence is not contiguous: {actual}")
    return title, chapters


def trim_blank_edges(lines: list[str]) -> None:
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()


def parse_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_alignment_row(line: str) -> bool:
    if not line.lstrip().startswith("|"):
        return False
    cells = parse_table_row(line)
    return bool(cells) and all(ALIGN_RE.match(cell) for cell in cells)


def plain_inline(text: str) -> str:
    text = re.sub(r"\\([\\`*{}[\]()#+.!_-])", r"\1", text)
    text = text.replace("**", "").replace("*", "")
    return text.strip()


def render_inline(text: str) -> str:
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\\([\\`*{}\[\]()#+.!_-])", r"\1", escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", escaped)
    return escaped


def render_chapter_body(chapter: Chapter) -> str:
    lines = chapter.lines
    blocks: list[str] = []
    paragraph: list[str] = []
    i = 0

    def flush_paragraph() -> None:
        if not paragraph:
            return
        rendered_parts: list[str] = []
        for part in paragraph:
            if not part.strip():
                continue
            rendered_parts.append(render_inline(part.strip()))
            rendered_parts.append("<br>" if part.endswith("  ") else " ")
        content = "".join(rendered_parts).rstrip()
        if content:
            blocks.append(f"<p>{content}</p>")
        paragraph.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            i += 1
            continue

        if SCENE_BREAK_RE.match(stripped):
            flush_paragraph()
            blocks.append('<div class="scene-break" aria-label="Scene break">◆</div>')
            i += 1
            continue

        if line.lstrip().startswith("|") and i + 1 < len(lines) and is_alignment_row(lines[i + 1]):
            flush_paragraph()
            rows: list[list[str]] = [parse_table_row(line)]
            i += 2
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(parse_table_row(lines[i]))
                i += 1
            populated_rows = [
                row for row in rows
                if len(row) >= 2 and plain_inline(row[1])
            ]
            if populated_rows:
                rendered_rows = []
                for row in populated_rows:
                    rendered_rows.append(
                        "<tr>"
                        f'<th scope="row">{render_inline(row[0])}</th>'
                        f"<td>{render_inline(row[1])}</td>"
                        "</tr>"
                    )
                blocks.append(
                    '<div class="chapter-data"><table><tbody>'
                    + "".join(rendered_rows)
                    + "</tbody></table></div>"
                )
            continue

        paragraph.append(line)
        i += 1

    flush_paragraph()
    return "\n".join(blocks)


def part_groups(chapters: list[Chapter]) -> list[tuple[str, str, list[Chapter]]]:
    groups: list[tuple[str, str, list[Chapter]]] = []
    for chapter in chapters:
        key = (chapter.part_number, chapter.part_title)
        if not groups or groups[-1][:2] != key:
            groups.append((chapter.part_number, chapter.part_title, []))
        groups[-1][2].append(chapter)
    return groups


def render_toc(chapters: list[Chapter], current: int | None = None, prefix: str = "") -> str:
    sections = []
    for number, title, group in part_groups(chapters):
        items = []
        for chapter in group:
            active = ' aria-current="page" class="active"' if chapter.number == current else ""
            items.append(
                f'<li><a href="{prefix}{chapter.filename}"{active}>'
                f'<span>{chapter.number}</span>{html.escape(chapter.title)}</a></li>'
            )
        sections.append(
            f'<section><h3>Part {html.escape(number)}</h3>'
            f'<p>{html.escape(title)}</p><ol>{"".join(items)}</ol></section>'
        )
    return "".join(sections)


def page_shell(
    *,
    title: str,
    description: str,
    body: str,
    css_path: str,
    js_path: str,
    body_class: str,
) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{html.escape(description, quote=True)}">
  <meta name="color-scheme" content="light dark">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="{css_path}">
  <script defer src="{js_path}"></script>
</head>
<body class="{body_class}">
{body}
</body>
</html>
"""


def render_index(book_title: str, chapters: list[Chapter]) -> str:
    total_words = sum(chapter.word_count for chapter in chapters)
    cards = []
    for chapter in chapters:
        metadata = chapter.metadata
        meta_line = " · ".join(value for _, value in metadata if value)
        cards.append(
            f'<article class="chapter-card" data-search="{html.escape((chapter.title + " " + meta_line).lower(), quote=True)}">'
            f'<a href="chapters/{chapter.filename}">'
            f'<span class="chapter-number">Chapter {chapter.number}</span>'
            f'<h3>{html.escape(chapter.title)}</h3>'
            f'<p>{chapter.word_count:,} words · {chapter.read_minutes} min</p>'
            f'{f"<small>{html.escape(meta_line)}</small>" if meta_line else ""}'
            "</a></article>"
        )

    body = f"""
<header class="library-hero">
  <p class="eyebrow">A novel</p>
  <h1>{html.escape(book_title)}</h1>
  <p class="deck">A chapter-by-chapter reading edition generated from the manuscript.</p>
  <p class="book-stats">{len(chapters)} chapters · {total_words:,} words · about {round(total_words / 240 / 60, 1)} hours</p>
  <div class="hero-actions">
    <a class="primary" href="chapters/{chapters[0].filename}">Start reading</a>
    <a id="continue-reading" class="secondary" href="chapters/{chapters[0].filename}" hidden>Continue reading</a>
  </div>
</header>
<main class="library">
  <label class="search">
    <span>Find a chapter</span>
    <input id="chapter-search" type="search" placeholder="Search titles or chapter data" autocomplete="off">
  </label>
  <div class="library-layout">
    <nav class="part-toc" aria-label="Table of contents">{render_toc(chapters, prefix="chapters/")}</nav>
    <section class="chapter-grid" aria-label="Chapters">{"".join(cards)}</section>
  </div>
</main>
<footer class="site-footer">Generated from <code>astrans.md</code>. Rebuild with <code>make novel</code>.</footer>
"""
    return page_shell(
        title=book_title,
        description=f"Read {book_title}, chapter by chapter.",
        body=body,
        css_path="assets/reader.css",
        js_path="assets/reader.js",
        body_class="index-page",
    )


def render_chapter_page(book_title: str, chapter: Chapter, chapters: list[Chapter]) -> str:
    idx = chapter.number - 1
    previous = chapters[idx - 1] if idx > 0 else None
    following = chapters[idx + 1] if idx + 1 < len(chapters) else None
    previous_link = (
        f'<a rel="prev" href="{previous.filename}"><span>Previous</span>{html.escape(previous.title)}</a>'
        if previous
        else '<span></span>'
    )
    next_link = (
        f'<a rel="next" href="{following.filename}"><span>Next</span>{html.escape(following.title)}</a>'
        if following
        else '<a href="../index.html"><span>Finished</span>Table of contents</a>'
    )

    body = f"""
<div id="reading-progress" aria-hidden="true"></div>
<header class="reader-bar">
  <a class="book-link" href="../index.html">{html.escape(book_title)}</a>
  <div class="reader-tools" aria-label="Reading controls">
    <button id="toc-toggle" type="button" aria-expanded="false" aria-controls="toc-panel">Contents</button>
    <button id="font-down" type="button" aria-label="Decrease text size">A−</button>
    <button id="font-up" type="button" aria-label="Increase text size">A+</button>
    <button id="theme-toggle" type="button">Theme</button>
  </div>
</header>
<aside id="toc-panel" class="toc-panel" aria-label="Table of contents" hidden>
  <button id="toc-close" class="toc-close" type="button">Close</button>
  {render_toc(chapters, current=chapter.number)}
</aside>
<main class="reader">
  <article>
    <header class="chapter-header">
      <p class="part-label">Part {html.escape(chapter.part_number)} · {html.escape(chapter.part_title)}</p>
      <p class="chapter-label">Chapter {chapter.number}</p>
      <h1>{html.escape(chapter.title)}</h1>
      <p class="reading-time">{chapter.word_count:,} words · about {chapter.read_minutes} minutes</p>
    </header>
    <section class="chapter-copy">
      {render_chapter_body(chapter)}
    </section>
    <nav class="chapter-nav" aria-label="Chapter navigation">
      {previous_link}
      {next_link}
    </nav>
  </article>
</main>
"""
    return page_shell(
        title=f"Chapter {chapter.number}: {chapter.title} · {book_title}",
        description=f"Chapter {chapter.number}, {chapter.title}, from {book_title}.",
        body=body,
        css_path="../assets/reader.css",
        js_path="../assets/reader.js",
        body_class="chapter-page",
    )


READER_CSS = r"""
:root {
  color-scheme: light;
  --paper: #f4efe4;
  --paper-deep: #e9e0cf;
  --ink: #25231f;
  --muted: #746c60;
  --line: #cfc3b0;
  --accent: #8a3f2d;
  --accent-soft: #ead2c8;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --reader-size: 20px;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #171918;
  --paper-deep: #202321;
  --ink: #e5dfd3;
  --muted: #aaa294;
  --line: #3d403b;
  --accent: #df8f73;
  --accent-soft: #492d25;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--serif);
}
a { color: inherit; }
button, input { font: inherit; }

.library-hero {
  min-height: 48vh;
  padding: clamp(4rem, 10vw, 9rem) 6vw 4rem;
  display: grid;
  place-content: center;
  text-align: center;
  background:
    radial-gradient(circle at 50% 15%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 34rem),
    linear-gradient(160deg, var(--paper), var(--paper-deep));
  border-bottom: 1px solid var(--line);
}
.eyebrow, .part-label, .chapter-label {
  margin: 0 0 .8rem;
  color: var(--accent);
  font: 700 .76rem/1 var(--sans);
  letter-spacing: .18em;
  text-transform: uppercase;
}
.library-hero h1 {
  margin: 0;
  font-size: clamp(3.8rem, 10vw, 8rem);
  font-weight: 500;
  letter-spacing: -.045em;
}
.deck { max-width: 36rem; margin: 1.2rem auto .5rem; color: var(--muted); font-size: 1.2rem; }
.book-stats { color: var(--muted); font: .85rem/1.5 var(--sans); }
.hero-actions { display: flex; justify-content: center; gap: .7rem; margin-top: 1.4rem; flex-wrap: wrap; }
.hero-actions a {
  padding: .75rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 999px;
  text-decoration: none;
  font: 700 .85rem/1 var(--sans);
}
.hero-actions .primary { background: var(--accent); color: var(--paper); }
.hero-actions .secondary { color: var(--accent); }

.library { width: min(1160px, 92vw); margin: 0 auto; padding: 3rem 0 6rem; }
.search { display: grid; gap: .45rem; max-width: 36rem; margin: 0 auto 3rem; }
.search span { color: var(--muted); font: 700 .75rem/1 var(--sans); text-transform: uppercase; letter-spacing: .12em; }
.search input {
  width: 100%;
  padding: .9rem 1rem;
  color: var(--ink);
  background: var(--paper-deep);
  border: 1px solid var(--line);
  border-radius: .35rem;
}
.library-layout { display: grid; grid-template-columns: 15rem 1fr; gap: 3rem; align-items: start; }
.part-toc { position: sticky; top: 2rem; }
.part-toc section + section, .toc-panel section + section { margin-top: 2rem; }
.part-toc h3, .toc-panel h3 { margin: 0; color: var(--accent); font: 700 .75rem/1 var(--sans); text-transform: uppercase; letter-spacing: .15em; }
.part-toc section > p, .toc-panel section > p { margin: .4rem 0 .8rem; color: var(--muted); font-style: italic; }
.part-toc ol, .toc-panel ol { margin: 0; padding: 0; list-style: none; }
.part-toc li a, .toc-panel li a {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: .3rem;
  padding: .36rem 0;
  color: var(--muted);
  text-decoration: none;
  font: .84rem/1.3 var(--sans);
}
.part-toc li a:hover, .toc-panel li a:hover, .toc-panel li a.active { color: var(--accent); }
.part-toc li span, .toc-panel li span { font-variant-numeric: tabular-nums; }
.chapter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.chapter-card { min-height: 12rem; background: var(--paper); }
.chapter-card[hidden] { display: none; }
.chapter-card a { display: block; height: 100%; padding: 1.5rem; text-decoration: none; }
.chapter-card a:hover { background: var(--paper-deep); }
.chapter-number { color: var(--accent); font: 700 .7rem/1 var(--sans); text-transform: uppercase; letter-spacing: .12em; }
.chapter-card h3 { margin: .7rem 0 1.2rem; font-size: 1.7rem; font-weight: 500; }
.chapter-card p, .chapter-card small { color: var(--muted); font: .78rem/1.5 var(--sans); }
.chapter-card small { display: block; margin-top: .5rem; }
.site-footer { padding: 2rem; color: var(--muted); text-align: center; border-top: 1px solid var(--line); font: .75rem/1.5 var(--sans); }

#reading-progress { position: fixed; z-index: 20; top: 0; left: 0; height: 3px; width: 0; background: var(--accent); }
.reader-bar {
  position: sticky;
  z-index: 10;
  top: 0;
  min-height: 3.6rem;
  padding: .65rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
}
.book-link { color: var(--accent); text-decoration: none; font: 700 .8rem/1 var(--sans); letter-spacing: .08em; text-transform: uppercase; }
.reader-tools { display: flex; gap: .35rem; }
.reader-tools button, .toc-close {
  padding: .45rem .65rem;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: .25rem;
  cursor: pointer;
  font: 700 .72rem/1 var(--sans);
}
.reader-tools button:hover, .toc-close:hover { color: var(--accent); border-color: var(--accent); }
.reader { width: min(100% - 2rem, 46rem); margin: 0 auto; }
.chapter-header { padding: clamp(4rem, 11vw, 8rem) 0 3.4rem; text-align: center; border-bottom: 1px solid var(--line); }
.chapter-header h1 { max-width: 38rem; margin: .2rem auto 1rem; font-size: clamp(2.6rem, 7vw, 4.8rem); line-height: 1.02; font-weight: 500; letter-spacing: -.035em; }
.reading-time { color: var(--muted); font: .8rem/1.4 var(--sans); }
.chapter-copy { padding: 3.5rem 0 5rem; font-size: var(--reader-size); line-height: 1.72; }
.chapter-copy p { margin: 0 0 1.3em; }
.chapter-copy p:first-of-type::first-letter {
  float: left;
  margin: .08em .1em 0 0;
  color: var(--accent);
  font-size: 4.2em;
  line-height: .75;
}
.chapter-copy em { font-style: italic; }
.chapter-copy strong { font-weight: 700; }
.chapter-data { margin: 0 0 3rem; padding: 1rem 1.2rem; background: var(--paper-deep); border: 1px solid var(--line); border-radius: .35rem; }
.chapter-data table { width: 100%; border-collapse: collapse; font: .78rem/1.45 var(--sans); }
.chapter-data th, .chapter-data td { padding: .4rem .3rem; text-align: left; border-bottom: 1px solid var(--line); }
.chapter-data tr:last-child th, .chapter-data tr:last-child td { border-bottom: 0; }
.chapter-data th:first-child, .chapter-data td:first-child { color: var(--muted); }
.scene-break { margin: 3.2rem 0; color: var(--accent); text-align: center; font-size: .75rem; }
.chapter-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-bottom: 6rem; background: var(--line); border: 1px solid var(--line); }
.chapter-nav > a, .chapter-nav > span { min-height: 7rem; padding: 1.2rem; background: var(--paper); text-decoration: none; }
.chapter-nav > a:last-child { text-align: right; }
.chapter-nav > a:hover { background: var(--paper-deep); }
.chapter-nav a span { display: block; margin-bottom: .5rem; color: var(--muted); font: 700 .7rem/1 var(--sans); text-transform: uppercase; letter-spacing: .12em; }

.toc-panel {
  position: fixed;
  z-index: 30;
  inset: 0 auto 0 0;
  width: min(24rem, 88vw);
  padding: 4.5rem 1.5rem 2rem;
  overflow-y: auto;
  background: var(--paper);
  border-right: 1px solid var(--line);
  box-shadow: 1rem 0 3rem rgb(0 0 0 / .18);
}
.toc-panel[hidden] { display: none; }
.toc-close { position: absolute; top: 1rem; right: 1rem; }

@media (max-width: 760px) {
  .library-layout { grid-template-columns: 1fr; }
  .part-toc { position: static; columns: 2; column-gap: 2rem; }
  .part-toc section { break-inside: avoid; }
  .chapter-grid { grid-template-columns: 1fr; }
  .reader-bar { align-items: flex-start; }
  .book-link { padding-top: .55rem; }
  .reader-tools { flex-wrap: wrap; justify-content: flex-end; }
}

@media print {
  .reader-bar, #reading-progress, .toc-panel, .chapter-nav { display: none !important; }
  .reader { width: auto; }
  .chapter-copy { font-size: 12pt; }
}
"""


READER_JS = r"""
(() => {
  const root = document.documentElement;
  const themeKey = "astrans-reader-theme";
  const sizeKey = "astrans-reader-size";
  const lastKey = "astrans-reader-last";

  const storedTheme = localStorage.getItem(themeKey);
  if (storedTheme) root.dataset.theme = storedTheme;
  const storedSize = Number(localStorage.getItem(sizeKey));
  if (storedSize) root.style.setProperty("--reader-size", `${storedSize}px`);

  const themeButton = document.querySelector("#theme-toggle");
  themeButton?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem(themeKey, next);
  });

  const changeSize = (delta) => {
    const current = parseFloat(getComputedStyle(root).getPropertyValue("--reader-size")) || 20;
    const next = Math.max(16, Math.min(28, current + delta));
    root.style.setProperty("--reader-size", `${next}px`);
    localStorage.setItem(sizeKey, String(next));
  };
  document.querySelector("#font-down")?.addEventListener("click", () => changeSize(-1));
  document.querySelector("#font-up")?.addEventListener("click", () => changeSize(1));

  const toc = document.querySelector("#toc-panel");
  const tocToggle = document.querySelector("#toc-toggle");
  const closeToc = () => {
    if (!toc || !tocToggle) return;
    toc.hidden = true;
    tocToggle.setAttribute("aria-expanded", "false");
  };
  tocToggle?.addEventListener("click", () => {
    if (!toc) return;
    toc.hidden = !toc.hidden;
    tocToggle.setAttribute("aria-expanded", String(!toc.hidden));
  });
  document.querySelector("#toc-close")?.addEventListener("click", closeToc);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeToc();
    if (event.key === "ArrowLeft") document.querySelector('[rel="prev"]')?.click();
    if (event.key === "ArrowRight") document.querySelector('[rel="next"]')?.click();
  });

  const progress = document.querySelector("#reading-progress");
  if (progress) {
    localStorage.setItem(lastKey, location.href);
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - innerHeight;
      const amount = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
      progress.style.width = `${Math.min(100, Math.max(0, amount))}%`;
    };
    addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  const continueLink = document.querySelector("#continue-reading");
  const last = localStorage.getItem(lastKey);
  if (continueLink && last) {
    continueLink.href = last;
    continueLink.hidden = false;
  }

  const search = document.querySelector("#chapter-search");
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll(".chapter-card").forEach((card) => {
      card.hidden = query !== "" && !card.dataset.search.includes(query);
    });
  });
})();
"""


def build(source: Path, output: Path) -> None:
    book_title, chapters = parse_book(source)
    if output.exists():
        shutil.rmtree(output)
    chapters_dir = output / "chapters"
    assets_dir = output / "assets"
    chapters_dir.mkdir(parents=True)
    assets_dir.mkdir(parents=True)

    (output / "index.html").write_text(render_index(book_title, chapters), encoding="utf-8")
    for chapter in chapters:
        page = render_chapter_page(book_title, chapter, chapters)
        (chapters_dir / chapter.filename).write_text(page, encoding="utf-8")

    (assets_dir / "reader.css").write_text(READER_CSS.strip() + "\n", encoding="utf-8")
    (assets_dir / "reader.js").write_text(READER_JS.strip() + "\n", encoding="utf-8")
    manifest = {
        "title": book_title,
        "chapterCount": len(chapters),
        "wordCount": sum(chapter.word_count for chapter in chapters),
        "chapters": [
            {
                "number": chapter.number,
                "title": chapter.title,
                "part": chapter.part_number,
                "partTitle": chapter.part_title,
                "filename": f"chapters/{chapter.filename}",
                "wordCount": chapter.word_count,
                "readMinutes": chapter.read_minutes,
            }
            for chapter in chapters
        ],
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {len(chapters)} chapters and {manifest['wordCount']:,} words "
        f"into {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}"
    )


if __name__ == "__main__":
    args = parse_args()
    build(args.source.resolve(), args.output.resolve())
