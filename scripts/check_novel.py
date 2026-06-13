#!/usr/bin/env python3
"""Validate the generated Astrans reader."""

from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NOVEL = ROOT / "novel"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            if element_id in self.ids:
                raise ValueError(f"Duplicate id: {element_id}")
            self.ids.add(element_id)
        href = values.get("href")
        if href:
            self.hrefs.append(href)


def main() -> None:
    pages = sorted(NOVEL.rglob("*.html"))
    if len(pages) != 36:
        raise ValueError(f"Expected 36 HTML pages, found {len(pages)}")

    for page in pages:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        parser.close()
        for href in parser.hrefs:
            if href.startswith(("http:", "https:", "#")):
                continue
            target = (page.parent / href).resolve()
            if not target.exists():
                raise ValueError(f"{page.relative_to(ROOT)} links to missing {href}")

    manifest = json.loads((NOVEL / "manifest.json").read_text(encoding="utf-8"))
    chapters = manifest["chapters"]
    if manifest["chapterCount"] != 35:
        raise ValueError("Manifest chapter count is not 35")
    if [chapter["number"] for chapter in chapters] != list(range(1, 36)):
        raise ValueError("Manifest chapters are not contiguous")
    if len({chapter["filename"] for chapter in chapters}) != 35:
        raise ValueError("Manifest chapter filenames are not unique")

    manuscript = (ROOT / "astrans.md").read_text(encoding="utf-8")
    source_breaks = len(re.findall(r" {2,}$", manuscript, flags=re.MULTILINE))
    output_breaks = sum(
        page.read_text(encoding="utf-8").count("<br>")
        for page in (NOVEL / "chapters").glob("*.html")
    )
    if output_breaks != source_breaks:
        raise ValueError(
            f"Expected {source_breaks} intentional line breaks, found {output_breaks}"
        )

    print(
        f"Validated {len(pages)} pages, {len(chapters)} chapters, all links, "
        f"and {output_breaks} intentional line breaks."
    )


if __name__ == "__main__":
    main()
