Filled in from chapter-loop-template.md.

Use $write-review-loop from /Users/ken/astrans/astrans/skills/write-review-loop.

I want to insert a new chapter before the current chapter 36, using a bounded writer/reviewer
loop with clean session context.

Do not read the whole manuscript. Keep context tightly bounded.

Numbering is dynamic in the source document. Chapters can be inserted or deleted at will and
are always renumbered correctly. Do not worry about renumbering any files. Just write the
content of the new chapter.

## Bounded file list

Use these files only:
- /Users/ken/astrans/astrans/manuscript/chapters/18-the-charter.md
- /Users/ken/astrans/astrans/manuscript/chapters/19-twinkle-twinkle-little-star.md
- /Users/ken/astrans/astrans/manuscript/chapters/20-baracoa.md
- /Users/ken/astrans/astrans/manuscript/chapters/21-lunar-power-up.md
- /Users/ken/astrans/astrans/manuscript/chapters/22-sidestep.md
- /Users/ken/astrans/astrans/manuscript/chapters/23-space-freighters.md
- /Users/ken/astrans/astrans/manuscript/chapters/24-the-seine.md
- /Users/ken/astrans/astrans/manuscript/chapters/25-jovian-research-institute.md
- /Users/ken/astrans/astrans/manuscript/chapters/26-lhotel-bounty.md
- /Users/ken/astrans/astrans/manuscript/chapters/27-heavy-lift.md
- /Users/ken/astrans/astrans/manuscript/chapters/28-sinoplex.md
- /Users/ken/astrans/astrans/manuscript/chapters/29-reach.md
- /Users/ken/astrans/astrans/manuscript/chapters/30-batidas.md
- /Users/ken/astrans/astrans/manuscript/chapters/31-tans-cantina.md
- /Users/ken/astrans/astrans/manuscript/chapters/32-corporate-meddling.md
- /Users/ken/astrans/astrans/manuscript/chapters/33-triangulation.md
- /Users/ken/astrans/astrans/manuscript/chapters/34-proof.md
- /Users/ken/astrans/astrans/manuscript/chapters/35-split-rigs.md
- /Users/ken/astrans/astrans/chapter-36.md

There is no separate direction-notes file for this chapter and no forward-constraint chapter
to read (the chapter that currently follows this insertion point lives outside this repo).

`chapter-36.md` serves as both the author's brief and the seed material. Treat its concrete
content (specific beats, scenes, dialogue, character choices) as something to build from and
preserve. Preserve the facts and beats, not necessarily the execution of them: if a beat in the
seed is thin or flat as written (this has already happened once, with the ending), fixing that
is the job, not something to carry forward untouched out of deference to "the seed says so."
Where the seed conflicts with continuity established in chapters 18-35, flag the conflict in
the diagnosis rather than silently resolving it. Where a passage is genuinely ambiguous rather
than definitively wrong, present the plausible readings and ask, rather than silently picking
one.

## Workflow

1. Read chapters 18-35 for voice, tone, structural conventions, and local continuity. This is
   Part II of the book (Jovian Resource Corporation); its conventions differ from Part I:
   - The price/production/consumption epigraph table is left blank in every Part II chapter.
     Match that; do not invent numbers for it.
   - POV is looser than Part I. Chapters follow one or two main characters closely but may cut
     to a third party's beat within a scene.
   - Liberal use of `***` scene breaks for chapters that span weeks or months.
   - A recurring house pattern: an outside expert arrives, cuts through a bureaucrat's
     incompetence in one blunt confrontation, and gets hired on unusual terms. This is fine to
     reuse (it recurs legitimately across Part II) but should not be staged identically to its
     most recent prior use.
   - Chapters in this range typically run 1,000-3,900 words.
2. Read `chapter-36.md` as the author's brief and seed material.
3. Before drafting, give a short diagnosis covering:
   - what tone/voice it must match, per chapters 18-35
   - what must connect backward to chapter 35 (the Split Rig program's state, Halden's
     established title and covert-communication habits, Elin's "you'll need allies" setup)
   - what in `chapter-36.md` should be preserved or reworked, and any conflicts or ambiguities,
     flagged rather than silently resolved
   - given how complete the seed draft already is, whether this is closer to a
     write-from-notes job or a developmental-compression/scene-polish job
4. Propose a bounded plan: what to keep fully dramatized, what to compress into montage, what
   needs resolving. Do not draft until the plan is approved.
5. Draft.
6. Run the deterministic metrics against chapters 18-35. Use them as a diagnostic, not a
   verdict.
7. Run a critical craft pass. This is separate from, and in addition to, the metrics pass, and
   it is not optional. For the opening, the midpoint or turn, the ending, and any other scene
   that functions as a structural hinge: state in one sentence what emotional or dramatic work
   that beat is supposed to be doing, and whether the draft as written actually delivers it. If
   the honest answer for any of them is "no" or "it's just logistics," that beat needs
   revision, regardless of how clean the metrics and continuity checks came back. A draft can
   pass every deterministic check and still fail this pass. That is expected, and is the reason
   this step exists separately rather than being folded into step 6. This chapter's ending, in
   particular, is a known risk: the recruits who ship out have no name and no witness, and the
   stakes the chapter spent real effort establishing (people risking their lives, beneficiaries
   paid for twenty years) have to actually land at the moment those people leave, not just be
   referenced earlier and left to imply themselves.
8. Only after both the metrics pass and the critical craft pass, finalize.

## Resolved decisions

Carry these forward on any re-run; do not re-litigate unless told otherwise:
- Training happens at JRI (Jamal), in a new area that Catherine develops there. Use the seed
  draft's own Kim/JRI land-negotiation scene and the Savannah shipping-container-dorm build-out
  as written; do not relocate training to a desert camp or any other site. (Note: an earlier
  pass fabricated a Gobi Desert/Karaburan setting that does not exist anywhere in
  `chapter-36.md`. Verify any claim about the seed's content against the actual file text
  before treating it as established, especially before writing it here as resolved.)
- Funnel: 900 applicants are accepted; the first 500 to respond are admitted (a first-come
  cutoff, not a merit cutoff, at that stage); 300 graduate; of those 300, 200 are sent to Ceres
  and 100 are sent to Jupiter. No one from this cohort is sent home.
- Chapter title: "Launch."
- The chapter ends on the launch off Earth itself. No coda scene after it (an earlier draft
  added one; it was cut on request). The ending needing to carry emotional weight without a
  coda to lean on is exactly why step 7 above calls this beat out specifically.

## Output versioning

Do not overwrite `chapter-36.md`. That file is the author's rough draft and is only updated
when explicitly told to install a version as canonical.

Instead, save each completed, approved-by-the-loop draft to
`manuscript/chapters/versions/36-launch-<model>-<n>.md`.
- `<model>` is a lowercase, hyphenated slug identifying whichever model is running the rewrite
  this time (e.g. `fable-5`, `sonnet-5`, `opus-4-8`).
- `<n>` is a two-digit run counter, global across all models: scan
  `manuscript/chapters/versions/` for existing files matching `36-launch-*-[0-9][0-9].md`, take
  the highest `<n>` found, and use the next integer. Start at `01` if none exist.

Create `manuscript/chapters/versions/` if it doesn't exist. State the exact versioned filename
written at the end of the run.

## Constraints

- Absolutely no em dashes anywhere in prose. This is a hard rule, not a preference to weigh
  against others. Use a period, comma, or colon instead, whichever reads most like the rest of
  the manuscript in that spot.
- The goal is not to change the plot drastically.
- Preserve continuity with chapters 18-35.
- Treat `chapter-36.md` as the primary source of current author intent for content, not as a
  shield against real editorial judgment on execution.
- Improve pacing, clarity, and dramatic effectiveness. Be especially alert for repetitive
  phrasing, flat diction, and sections, especially structural hinge points, that feel
  mechanically competent but emotionally thin. Step 7 above exists specifically to catch this;
  a clean metrics pass is not a substitute for actually doing it.
- Use deterministic metrics only as supporting signals, never as the final judgment.

When evaluating the draft, compare it against the style baseline of chapters 18-35, not Part I.
