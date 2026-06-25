# Context Pack

Use a bounded context pack instead of a whole-book dump.

## Recommended chapter rewrite pack

For revising a middle chapter:

- upstream chapters that establish voice and continuity
- the target chapter brief
- downstream chapter that constrains the landing
- author notes on motivation, tension, and dissatisfaction
- hard constraints file

## Minimal viable pack for a middle-chapter rewrite

- relevant upstream chapters
- the next chapter or a downstream outline beat
- `target_chapter_brief.md`
- `author_notes.md`
- `hard_constraints.md`

## Why bounded packs matter

- lowers context leakage risk
- makes reviewer feedback more attributable
- reduces accidental manuscript-wide drift
- makes iterative comparisons easier

## File conventions

Prefer separate files for:

- `brief.md`
- `author_notes.md`
- `hard_constraints.md`
- `continuity_notes.md`

Avoid hiding these inside one giant prompt blob.
