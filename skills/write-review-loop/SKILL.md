---
name: write-review-loop
description: Run an iterative fiction drafting loop with bounded context, separate writer and reviewer roles, and deterministic prose metrics. Use when Codex needs to draft or revise a chapter from a brief, nearby context chapters, continuity constraints, and author motivation notes, then iterate until approval or plateau.
---
# Write Review Loop

## Overview

Use this skill to draft or revise a chapter with a bounded writer/reviewer loop. The core pattern is: assemble only the needed chapter context, draft once, review against story goals and continuity, compare metrics to a nearby baseline, then decide whether another revision is justified.

## Inputs

Collect these inputs before drafting:

- chapter brief: what must happen in the target chapter
- bounded context: prior chapters, the next chapter, and any continuity notes
- hard constraints: POV, tense, forbidden changes, required beats, target length
- author notes: motivation, tone, emotional intent, what feels wrong in the current version
- baseline files: surrounding chapters used for deterministic comparison

If the source manuscript is monolithic, split it first with the workspace script:

```bash
rtk proxy python3 scripts/split_manuscript.py path/to/book.md --output path/to/output/chapters
```

Read [references/context-pack.md](references/context-pack.md) for the recommended context shape.

## Workflow

### 1. Build a bounded context pack

Prefer the smallest set of files that can support the task. For a rewrite of a middle chapter, that often means:

- upstream chapters for voice and continuity
- the next chapter or planned next beat for forward pressure and landing constraints
- a one-file brief saying what the target chapter must accomplish
- author notes about motivation or dissatisfaction

Do not load the whole manuscript if the user is trying to limit context leakage.

### 2. Establish the revision target

Before drafting, restate the target in one compact note:

- what must happen by the end
- what cannot change
- what the emotional movement should be
- what the reviewer should penalize

If the user has named a weak chapter, treat that chapter as suspect rather than canonical.

### 3. Draft with a writer role

The writer should:

- write the chapter directly
- honor the brief and hard constraints first
- preserve continuity details from the bounded context
- avoid meta commentary
- prefer concrete scenes and clear causality

### 4. Review with a separate reviewer role

The reviewer should not rewrite prose wholesale. The reviewer should diagnose:

- continuity problems
- motivation gaps
- pacing drag
- weak scene transitions
- repetitive diction
- failure to set up the next chapter

Require the reviewer to produce structured feedback with:

- keep
- cut
- missing
- unclear
- next revision priorities
- overall pass/fail or score

### 5. Run deterministic metrics

Use the workspace metrics script on the candidate and baseline chapters:

```bash
rtk proxy python3 scripts/text_metrics.py candidate.md \
  --baseline-file chapter1.md \
  --baseline-file chapter2.md \
  --format markdown
```

Read [references/metrics.md](references/metrics.md) for which metrics matter and how to interpret them.

Metrics are signals, not verdicts. Use them to catch drift and repetition, not to decide whether the chapter is artistically good.

### 6. Decide whether to continue

Continue the loop only if at least one of these is true:

- reviewer identifies a concrete fixable issue
- metrics show the draft is materially out-of-family with the baseline
- the latest revision clearly improved the chapter

Stop when one of these is true:

- reviewer approves
- reviewer feedback becomes minor and repetitive
- metrics stabilize and no longer move meaningfully
- another pass would likely churn wording rather than improve the chapter

## Output Expectations

Default outputs:

- final chapter draft
- reviewer notes for the final round
- a short metrics summary versus the baseline chapters
- a one-paragraph rationale for why the loop stopped

If the user asks for options, prefer 2 variants of the same chapter opening or difficult scene rather than 2 fully diverged chapters.

## Guardrails

- Keep the context pack explicit and inspectable.
- Do not smuggle in the entire manuscript when the user is trying to constrain exposure.
- Treat deterministic metrics as support, not truth.
- Do not claim story quality from surface metrics alone.
- Prefer direct file paths and explicit chapter lists over vague references like "the earlier material."
- If tooling for separate agents is unavailable in the current surface, emulate the loop serially with clearly separated writer and reviewer sections.
