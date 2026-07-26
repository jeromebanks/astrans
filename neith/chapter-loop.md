# Neith Chapter Loop

Neith-specific direction set for drafting or revising a chapter with a bounded writer/reviewer
loop and clean session context. This is the Neith specialization of the generic
`chapter-loop-template.md`. Copy this file per chapter operation (e.g.
`chapter-01-rewrite.md`) and fill in the bracketed sections. The Workflow and Constraints
sections stay as they are; only the bracketed material changes per chapter.

Use $write-review-loop from /Users/ken/astrans/astrans/skills/write-review-loop.

I want to [rewrite chapter <N> / insert a new chapter before chapter <N>] of the Neith story,
using a bounded writer/reviewer loop with clean session context.

Do not read the whole manuscript. Keep context tightly bounded.

## Read this first (required)

Before doing anything else, read `neith/worldbuilding.md` in full. It is the canon reference for
the planet's physics, cosmology, terminology, characters, timeline, and prose conventions. Many
of these facts (especially the dense-air flight physics, the naming conventions for the lights,
and the "no em dashes" rule) are easy to get wrong from the chapter prose alone. Do not draft or
diagnose until you have read it. If the worldbuilding file and a chapter appear to conflict,
flag the conflict rather than silently resolving it; the bible is intended to be authoritative,
but the author decides.

## Bounded file list

Use these files only:
- `neith/worldbuilding.md` (read first, as above)
- [the accepted sibling chapters that establish local voice, tone, and continuity, i.e. the
  chapters adjacent to the target, not the whole story]
- [the forward-constraint chapter, if the target must set up something a later chapter opens
  inside of]
- `neith/guide.md` for seed/direction material [name the specific section(s) that correspond to
  the target chapter], and `neith/notes.md` for premise and framing.

Do NOT read the `neith/old/` directory. Those are superseded version attempts with different
continuity (a differently named pilot, "College of the Two Lights," a named ship). Reading them
risks pulling conflicting names and facts into the rewrite.

`neith/guide.md` serves as the seed material. Treat its concrete content (specific beats,
scenes, dialogue, character choices) as something to build from and preserve. Preserve the facts
and beats, not necessarily the execution: the seed prose is rough, and fixing a thin or flat
beat is the job, not something to carry forward untouched. Where the seed conflicts with the
worldbuilding bible or the sibling chapters, flag the conflict in the diagnosis. Where a passage
is genuinely ambiguous rather than definitively wrong, present the plausible readings and ask.

## Workflow

1. Read `neith/worldbuilding.md`. Then read the sibling chapters for voice, tone, structural
   conventions, and local continuity. [Note anything about this part of the story that differs
   from the rest.]
2. Read the seed/brief material (the named guide.md section and notes.md).
3. Before drafting, give a short diagnosis covering:
   - what tone/voice it must match
   - what must connect backward and forward (name the specific continuity hooks and the
     worldbuilding facts the chapter depends on)
   - what in the seed should be preserved or reworked, and any conflicts or ambiguities, flagged
     rather than silently resolved
   - whether this is closer to a write-from-notes job or a scene-polish job, given how complete
     the existing material already is
4. Propose a bounded plan: what to keep fully dramatized, what to compress, what needs
   resolving. Do not draft until the plan is approved.
5. Draft.
6. Run the deterministic metrics against the baseline sibling chapters (see Constraints). Use
   them as a diagnostic, not a verdict.
7. Run a critical craft pass, separate from and in addition to the metrics pass, and not
   optional. For the opening, the midpoint or turn, the ending, and any other structural hinge:
   state in one sentence what emotional or dramatic work that beat is supposed to do, and
   whether the draft as written delivers it. If the honest answer is "no" or "it's just
   logistics," that beat needs revision, regardless of clean metrics and continuity checks.
8. Only after both the metrics pass and the critical craft pass, finalize.

## Resolved decisions

[Chapter-specific decisions reached through discussion, to carry forward on any re-run rather
than re-litigate. State each as a fact, and note what it supersedes if it revises an earlier
resolution.]

## Output versioning

The canonical file `neith/0N-<slug>.md` is the current accepted draft. Do not overwrite it until
a rewrite is approved as final. Save in-progress attempts to `neith/versions/0N-<slug>-vNN.md`
(zero-padded run counter, starting v01), and copy the approved version over the canonical file
only once finalized.

## Constraints

- Absolutely no em dashes anywhere in prose. Hard rule, not a preference to weigh. Use a period,
  comma, or colon instead, whichever reads most like the rest of the manuscript in that spot.
- Honor the terminology and prose conventions in `neith/worldbuilding.md` exactly (the light
  names, the demonym "Venusian," the Ceiling, the flight physics, section-break and
  forward-shadow house style).
- The goal is not to change the plot drastically.
- Preserve continuity with the sibling chapters and the worldbuilding bible.
- Treat the seed material as the primary source of current author intent for content, not as a
  shield against real editorial judgment on execution.
- Improve pacing, clarity, and dramatic effectiveness. Be especially alert for repetitive
  phrasing, flat diction, and structural hinge points that feel mechanically competent but
  emotionally thin. Step 7 exists specifically to catch this.
- Use deterministic metrics only as supporting signals, never as the final judgment.

[Any chapter-specific constraints: title, POV requirements, length target, etc. Sibling chapters
run roughly 815-1180 words; keep a rewrite in that family unless there is a reason not to.]

When evaluating the draft, compare it against the sibling chapters named above, not the whole
story.
