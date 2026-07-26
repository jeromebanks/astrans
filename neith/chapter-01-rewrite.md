Use $write-review-loop from /Users/ken/astrans/astrans/skills/write-review-loop.

I want to rewrite chapter 01 ("Second Ground") of the Neith story, using a bounded
writer/reviewer loop with clean session context.

Do not read the whole manuscript. Keep context tightly bounded.

Numbering is stable: this is the first chapter of a three-chapter piece. There is no file
renumbering to worry about. The canonical file is `neith/01-second-ground.md`.

## Bounded file list

Use these files only:
- `neith/02-selaire-observatory.md` and `neith/03-the-long-death.md` — the accepted sibling
  chapters. These are the style baseline for voice, tone, structural conventions, and the
  continuity this chapter must hand off into. Chapter 02 is also the forward-constraint chapter:
  chapter 01 has to set up the observatory that chapter 02 opens forty years inside of.
- `neith/guide.md` — the rough full-story draft; its first three section-breaks are the seed
  material for this chapter (the flight and discovery, the debrief with Avel, the frenzy and
  Sélaire's observatory proposal).
- `neith/notes.md` — the premise, terminology (demonym: Venusian), tone brief, and the framing
  device (the "Neith" astronomical-mystery Wikipedia quotes).

Do NOT read the `neith/old/` directory. Those are superseded version attempts with different
continuity (a differently named pilot, "College of the Two Lights," a named ship). Reading them
risks pulling conflicting names and facts into the rewrite. Any craft ideas worth keeping from
them should already have been surfaced by the person configuring this loop.

`neith/guide.md` serves as the seed material. Treat its concrete content (specific beats: the
childhood gliders, the high freighter flight, the still lights and the second ground with an
edge, the debrief, "second ground" as the coined name, the four-year secret, Sélaire's pitch,
Serand's objection) as something to build from and preserve. Preserve the facts and beats, not
necessarily the execution: the seed prose is rough. Where the seed conflicts with continuity in
chapters 02/03, flag it rather than silently resolving. Where a passage is genuinely ambiguous
rather than wrong, present the readings and ask.

## Workflow

1. Read the sibling chapters (02, 03) for voice, tone, structural conventions, and the
   continuity this chapter feeds. Note the section-break house style (`***`), the close-third
   restraint, the single quiet forward-shadowing line per section, the absence of populated
   epigraph tables inside chapters (the framing quote lands only at the very end of chapter 03),
   and the typical chapter length (~950-1180 words).
2. Read the seed/brief material (guide.md sections 1-3, notes.md).
3. Before drafting, give a short diagnosis covering:
   - what tone/voice it must match
   - what must connect forward (the observatory, Sélaire's name, the "second ground" coinage,
     the hundred lights, the wandering-light detail that implies motion)
   - what in the seed should be preserved or reworked, and any conflicts or ambiguities, flagged
   - whether this is closer to a write-from-notes job or a scene-polish job, given that a strong
     draft already exists in `01-second-ground.md`
4. Propose a bounded plan: what to keep fully dramatized, what to compress, what needs
   resolving. Do not draft until the plan is approved.
5. Draft.
6. Run the deterministic metrics against the baseline files (02, 03). Use them as a diagnostic,
   not a verdict.
7. Run a critical craft pass, separate from and in addition to metrics, not optional. For the
   opening (Naelis's flight), the hinge (the moment the second light resolves into ground and
   the still lights appear), and the ending (Sélaire's proposal landing): state in one sentence
   what emotional or dramatic work each beat is supposed to do, and whether the draft delivers
   it. If the honest answer is "no" or "it's just logistics," that beat needs revision
   regardless of clean metrics.
8. Only after both the metrics pass and the critical craft pass, finalize.

## Resolved decisions

[To be filled in from the pre-draft conversation. Nothing settled yet beyond: continuity is
Naelis Kerr / Avel / Sélaire / Serand / Meriddon / Tavilly, matching the current canonical file
and guide.md, NOT the old/ versions.]

## Output versioning

The canonical file `neith/01-second-ground.md` is the current accepted draft. Do not overwrite
it until a rewrite is approved as final. Save in-progress rewrite attempts to
`neith/versions/01-second-ground-vNN.md` (zero-padded run counter, starting v01), and only copy
the approved version over `neith/01-second-ground.md` once finalized.

## Constraints

- Absolutely no em dashes anywhere in prose. Hard rule. Use a period, comma, or colon instead,
  whichever reads most like the rest of the manuscript.
- The goal is not to change the plot drastically.
- Preserve continuity with chapters 02 and 03.
- Treat the seed (guide.md) as the primary source of current author intent for content, not as a
  shield against editorial judgment on execution.
- Improve pacing, clarity, and dramatic effectiveness. Be alert for repetitive phrasing, flat
  diction, and structural-hinge sections that feel mechanically competent but emotionally thin.
- Use deterministic metrics only as supporting signals.

Chapter-specific: title "Second Ground"; close third on Naelis for the flight/debrief, widening
to a lighter narrative distance for the frenzy/proposal section (matching how 02 handles its
public-lecture material); target ~950-1180 words to sit in-family with 02/03.

When evaluating the draft, compare it against chapters 02 and 03, not the whole book.
