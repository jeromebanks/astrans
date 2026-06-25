#!/usr/bin/env python3
"""Deterministic prose metrics for chapter drafts.

This script intentionally avoids LLM calls. It produces directional signals for
pace, readability, lexical variety, repetition, and local cohesion.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
from collections import Counter
from pathlib import Path
from typing import Iterable


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "his",
    "i",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "she",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "was",
    "we",
    "were",
    "with",
    "you",
    "your",
}

WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
QUOTE_RE = re.compile(r"[\"“”](.*?)[\"“”]", re.DOTALL)
MARKDOWN_TABLE_RE = re.compile(r"^\s*\|.*\|\s*$")
MARKDOWN_TABLE_RULE_RE = re.compile(r"^\s*\|?[\s:-]+\|[\s|:-]*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute deterministic prose metrics.")
    parser.add_argument("files", nargs="+", type=Path, help="Text or markdown files to analyze.")
    parser.add_argument(
        "--baseline-file",
        action="append",
        type=Path,
        default=[],
        help="Optional baseline file. Repeatable.",
    )
    parser.add_argument(
        "--format",
        choices=("json", "markdown"),
        default="json",
        help="Output format.",
    )
    return parser.parse_args()


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def strip_markdown(text: str) -> str:
    cleaned_lines: list[str] = []
    for line in text.splitlines():
        if MARKDOWN_TABLE_RE.match(line) or MARKDOWN_TABLE_RULE_RE.match(line):
            continue
        line = re.sub(r"^\s{0,3}#{1,6}\s*", "", line)
        line = re.sub(r"[*_`]+", "", line)
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def split_paragraphs(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]


def split_sentences(text: str) -> list[str]:
    collapsed = re.sub(r"\s+", " ", text).strip()
    if not collapsed:
        return []
    return [part.strip() for part in SENTENCE_SPLIT_RE.split(collapsed) if part.strip()]


def syllable_count(word: str) -> int:
    normalized = re.sub(r"[^a-z]", "", word.lower())
    if not normalized:
        return 0
    if len(normalized) <= 3:
        return 1
    normalized = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", normalized)
    normalized = re.sub(r"^y", "", normalized)
    groups = re.findall(r"[aeiouy]+", normalized)
    return max(1, len(groups))


def mean(values: list[float]) -> float:
    return statistics.fmean(values) if values else 0.0


def median(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def pstdev(values: list[float]) -> float:
    return statistics.pstdev(values) if len(values) > 1 else 0.0


def mtld(tokens: list[str], threshold: float = 0.72) -> float:
    if not tokens:
        return 0.0

    def compute(sequence: list[str]) -> float:
        factors = 0.0
        types: set[str] = set()
        token_count = 0
        for token in sequence:
            token_count += 1
            types.add(token)
            ttr = len(types) / token_count
            if ttr <= threshold:
                factors += 1
                types = set()
                token_count = 0
        if token_count:
            ttr = len(types) / token_count
            if ttr != 1:
                factors += (1 - ttr) / (1 - threshold)
        return len(sequence) / factors if factors else 0.0

    forward = compute(tokens)
    backward = compute(list(reversed(tokens)))
    return (forward + backward) / 2 if forward and backward else max(forward, backward)


def difficult_word_count(tokens: list[str]) -> int:
    return sum(1 for token in tokens if syllable_count(token) >= 3)


def quoted_word_count(text: str) -> int:
    total = 0
    for match in QUOTE_RE.finditer(text):
        total += len(words(match.group(1)))
    return total


def normalized_tokens(text: str) -> list[str]:
    return [token.lower() for token in words(text)]


def content_words(text: str) -> set[str]:
    return {token for token in normalized_tokens(text) if token not in STOPWORDS}


def ngram_fraction(tokens: list[str], n: int) -> float:
    if len(tokens) < n or n <= 0:
        return 0.0
    ngrams = [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]
    counts = Counter(ngrams)
    repeated = sum(count for count in counts.values() if count > 1)
    return repeated / len(ngrams)


def top_ngram_share(tokens: list[str], n: int) -> float:
    if len(tokens) < n or n <= 0:
        return 0.0
    ngrams = [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]
    counts = Counter(ngrams)
    return counts.most_common(1)[0][1] / len(ngrams)


def adjacent_paragraph_overlap(paragraphs: list[str]) -> float:
    if len(paragraphs) < 2:
        return 0.0
    overlaps: list[float] = []
    for left, right in zip(paragraphs, paragraphs[1:]):
        left_set = content_words(left)
        right_set = content_words(right)
        union = left_set | right_set
        if not union:
            continue
        overlaps.append(len(left_set & right_set) / len(union))
    return mean(overlaps)


def flesch_reading_ease(word_count: int, sentence_count: int, syllables: int) -> float:
    if not word_count or not sentence_count:
        return 0.0
    return 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllables / word_count)


def flesch_kincaid(word_count: int, sentence_count: int, syllables: int) -> float:
    if not word_count or not sentence_count:
        return 0.0
    return 0.39 * (word_count / sentence_count) + 11.8 * (syllables / word_count) - 15.59


def gunning_fog(word_count: int, sentence_count: int, difficult_words: int) -> float:
    if not word_count or not sentence_count:
        return 0.0
    return 0.4 * ((word_count / sentence_count) + 100 * (difficult_words / word_count))


def smog(word_count: int, sentence_count: int, polysyllables: int) -> float:
    if sentence_count < 1:
        return 0.0
    return 1.043 * math.sqrt(polysyllables * (30 / sentence_count)) + 3.1291


def metric_bundle(path: Path) -> dict[str, float | int | str]:
    raw = load_text(path)
    text = strip_markdown(raw)
    paras = split_paragraphs(text)
    sents = split_sentences(text)
    toks = normalized_tokens(text)
    word_count = len(toks)
    sentence_lengths = [len(normalized_tokens(sentence)) for sentence in sents if sentence.strip()]
    paragraph_lengths = [len(normalized_tokens(paragraph)) for paragraph in paras if paragraph.strip()]
    syllables = sum(syllable_count(token) for token in toks)
    difficult = difficult_word_count(toks)
    quoted_words = quoted_word_count(text)

    return {
        "file": str(path),
        "characters": len(text),
        "words": word_count,
        "unique_words": len(set(toks)),
        "sentences": len(sents),
        "paragraphs": len(paras),
        "avg_word_length": round(mean([len(token) for token in toks]), 3),
        "avg_syllables_per_word": round(syllables / word_count, 3) if word_count else 0.0,
        "type_token_ratio": round(len(set(toks)) / word_count, 4) if word_count else 0.0,
        "mtld": round(mtld(toks), 3),
        "sentence_length_mean": round(mean(sentence_lengths), 3),
        "sentence_length_median": round(median(sentence_lengths), 3),
        "sentence_length_std": round(pstdev(sentence_lengths), 3),
        "paragraph_length_mean": round(mean(paragraph_lengths), 3),
        "paragraph_length_median": round(median(paragraph_lengths), 3),
        "paragraph_length_std": round(pstdev(paragraph_lengths), 3),
        "short_sentence_ratio": round(
            sum(1 for value in sentence_lengths if value <= 8) / len(sentence_lengths), 4
        )
        if sentence_lengths
        else 0.0,
        "long_sentence_ratio": round(
            sum(1 for value in sentence_lengths if value >= 25) / len(sentence_lengths), 4
        )
        if sentence_lengths
        else 0.0,
        "short_paragraph_ratio": round(
            sum(1 for value in paragraph_lengths if value <= 40) / len(paragraph_lengths), 4
        )
        if paragraph_lengths
        else 0.0,
        "long_paragraph_ratio": round(
            sum(1 for value in paragraph_lengths if value >= 120) / len(paragraph_lengths), 4
        )
        if paragraph_lengths
        else 0.0,
        "dialogue_word_ratio": round(quoted_words / word_count, 4) if word_count else 0.0,
        "adjacent_paragraph_overlap": round(adjacent_paragraph_overlap(paras), 4),
        "repeated_bigram_fraction": round(ngram_fraction(toks, 2), 4),
        "repeated_trigram_fraction": round(ngram_fraction(toks, 3), 4),
        "top_bigram_share": round(top_ngram_share(toks, 2), 4),
        "top_trigram_share": round(top_ngram_share(toks, 3), 4),
        "flesch_reading_ease": round(flesch_reading_ease(word_count, len(sents), syllables), 3),
        "flesch_kincaid_grade": round(flesch_kincaid(word_count, len(sents), syllables), 3),
        "gunning_fog": round(gunning_fog(word_count, len(sents), difficult), 3),
        "smog": round(smog(word_count, len(sents), difficult), 3),
    }


def numeric_keys(records: list[dict[str, object]]) -> list[str]:
    keys = []
    for key, value in records[0].items():
        if isinstance(value, (int, float)):
            keys.append(key)
    return keys


def baseline_summary(records: list[dict[str, object]]) -> dict[str, dict[str, float]]:
    summary: dict[str, dict[str, float]] = {}
    for key in numeric_keys(records):
        values = [float(record[key]) for record in records]
        summary[key] = {
            "mean": round(mean(values), 4),
            "std": round(pstdev(values), 4),
            "min": round(min(values), 4),
            "max": round(max(values), 4),
        }
    return summary


def compare_to_baseline(
    records: list[dict[str, object]], baseline: dict[str, dict[str, float]]
) -> list[dict[str, object]]:
    comparisons: list[dict[str, object]] = []
    for record in records:
        deltas: dict[str, float] = {}
        for key, stats in baseline.items():
            std = stats["std"]
            if std == 0:
                continue
            deltas[key] = round((float(record[key]) - stats["mean"]) / std, 3)
        comparisons.append({"file": record["file"], "z_scores": deltas})
    return comparisons


def render_markdown(payload: dict[str, object]) -> str:
    lines: list[str] = ["# Text Metrics", ""]
    for record in payload["files"]:
        lines.append(f"## {record['file']}")
        lines.append("")
        for key, value in record.items():
            if key == "file":
                continue
            lines.append(f"- `{key}`: {value}")
        lines.append("")
    baseline = payload.get("baseline")
    if baseline:
        lines.append("## Baseline")
        lines.append("")
        for key, stats in baseline.items():
            lines.append(
                f"- `{key}`: mean={stats['mean']} std={stats['std']} min={stats['min']} max={stats['max']}"
            )
        lines.append("")
    comparisons = payload.get("comparisons")
    if comparisons:
        lines.append("## Baseline Comparison")
        lines.append("")
        for item in comparisons:
            lines.append(f"### {item['file']}")
            lines.append("")
            ranked = sorted(
                item["z_scores"].items(),
                key=lambda pair: abs(pair[1]),
                reverse=True,
            )[:12]
            for key, value in ranked:
                lines.append(f"- `{key}` z-score: {value}")
            lines.append("")
    return "\n".join(lines).strip() + "\n"


def main() -> int:
    args = parse_args()
    file_metrics = [metric_bundle(path) for path in args.files]
    payload: dict[str, object] = {"files": file_metrics}

    if args.baseline_file:
        baseline_metrics = [metric_bundle(path) for path in args.baseline_file]
        baseline = baseline_summary(baseline_metrics)
        payload["baseline_files"] = baseline_metrics
        payload["baseline"] = baseline
        payload["comparisons"] = compare_to_baseline(file_metrics, baseline)

    if args.format == "json":
        print(json.dumps(payload, indent=2, ensure_ascii=True))
    else:
        print(render_markdown(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
