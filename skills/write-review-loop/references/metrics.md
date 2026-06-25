# Metrics

Use deterministic metrics as diagnostics.

## Strong signals

- sentence length mean and variance
- paragraph length mean and variance
- dialogue ratio
- MTLD
- repeated bigram and trigram fractions
- readability scores
- adjacent paragraph overlap

## Interpretation rules

- High repeated trigram fraction can indicate stale phrasing or AI-like repetition.
- Low MTLD can indicate flatter diction or over-reused vocabulary.
- Lower short-sentence ratio can indicate weaker beat-to-beat pacing.
- Large deviations from baseline are inspection targets, not automatic failures.

## What metrics cannot tell you

- whether the chapter is moving
- whether the motivations land
- whether the ending is earned
- whether the scene choices are right

## Baseline policy

Compare the candidate chapter against nearby accepted chapters, not universal targets.

A good default baseline for a target chapter is the accepted upstream chapters that establish the local voice and rhythm. Read the next chapter as a forward constraint when it exists, but do not automatically include it in the style baseline.
