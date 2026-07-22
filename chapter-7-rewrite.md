Use $write-review-loop from /Users/ken/astrans/astrans/skills/write-review-loop.

I want to rewrite chapter 7 of my novel using a bounded writer/reviewer loop with clean session context.

Do not read the whole manuscript. Keep context tightly bounded.

Do not read chapter 7 itself (`07-salty-metal.md`). It must not leak into context.

Do not read anything in `manuscript/chapters/versions/` before drafting. Those are prior rewrite attempts from earlier runs — possibly earlier sessions — and must not leak into a fresh draft, for the same reason chapter 7 itself is excluded.

Use these files only:
- /Users/ken/astrans/astrans/manuscript/chapters/01-the-tokaplex.md
- /Users/ken/astrans/astrans/manuscript/chapters/02-helium-fever.md
- /Users/ken/astrans/astrans/manuscript/chapters/03-the-moon-is-hard.md
- /Users/ken/astrans/astrans/manuscript/chapters/04-cold-storage.md
- /Users/ken/astrans/astrans/manuscript/chapters/05-argentina.md
- /Users/ken/astrans/astrans/manuscript/chapters/06-beyond-helium.md
- /Users/ken/astrans/astrans/manuscript/chapters/08-ceres.md
- /Users/ken/astrans/astrans/direction-notes-chapter-7.md
- /Users/ken/astrans/astrans/chapter-7-seed-draft.md

Workflow:
1. Read chapters 1-6 for voice, continuity, and local baseline.
2. Read chapter 8 as a forward constraint.
3. Read `direction-notes-chapter-7.md` as the author guidance file.
3b. Read `chapter-7-seed-draft.md` as the author's own seed material. Treat concrete
   content here (specific beats, images, lines, worldbuilding) as something to build
   from and preserve, not just draw inspiration from. If it's empty or missing, skip
   this input and proceed on `direction-notes-chapter-7.md` alone. If it conflicts
   with continuity from chapters 1-6 or 8, flag the conflict in your diagnosis rather
   than silently overriding either file.
4. Before rewriting anything, give me a short diagnosis of what chapter 7 should accomplish, based only on the above:
   - what tone/voice it must match, per chapters 1-6
   - what must be set up or preserved for chapter 8 to still work
   - what in `direction-notes-chapter-7.md` should drive the rewrite most strongly
   - what in `chapter-7-seed-draft.md` should be preserved or reworked
5. Then propose a bounded rewrite plan for chapter 7.
6. Do not rewrite yet until I approve the plan.

Output versioning:
- Do not overwrite `manuscript/chapters/07-salty-metal.md`. That file is only updated when I explicitly say to install a version as canonical.
- Instead, save each completed, approved-by-the-loop draft to `manuscript/chapters/versions/07-salty-metal-<model>-<n>.md`.
  - `<model>` is a lowercase, hyphenated slug identifying whichever model is running the rewrite this time (e.g. `fable-5`, `sonnet-5`, `opus-4-8`).
  - `<n>` is a two-digit run counter, global across all models: scan `manuscript/chapters/versions/` for existing files matching `07-salty-metal-*-[0-9][0-9].md`, take the highest `<n>` found, and use the next integer. Start at `01` if none exist.
  - Example: the first run on Sonnet 5 produces `07-salty-metal-sonnet-5-01.md`; a later run on Fable 5 produces `07-salty-metal-fable-5-02.md`, and so on, regardless of which model ran in between.
- Create `manuscript/chapters/versions/` if it doesn't exist.
- Tell me the exact versioned filename you wrote at the end of the run.

Constraints:
- The goal is not to change the plot drastically.
- Preserve continuity with chapters 1-6 and 8.
- Treat `direction-notes-chapter-7.md` as the primary source of current author intent.
- Improve pacing, clarity, and dramatic effectiveness.
- Be especially alert for repetitive phrasing, flat diction, and sections that feel mechanically competent but emotionally thin.
- Use deterministic metrics only as supporting signals, not as the final judgment.

When you evaluate chapter 7, compare it against the style baseline of chapters 1-6.
