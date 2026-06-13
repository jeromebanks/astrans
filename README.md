# Astrans

This repository contains the *Astrans* manuscript, a chapter-by-chapter HTML
reading edition, and the browser game *Tycho: Helium Fever*.

## Read the novel

```bash
make read
```

Open <http://127.0.0.1:8765/novel/>. The reader includes:

- all 35 chapters split into individual pages
- a searchable table of contents
- previous/next chapter navigation and keyboard arrow shortcuts
- light/dark themes and adjustable text size
- reading progress and a continue-reading link
- print-friendly chapter pages

Rebuild the HTML after editing `astrans.md`:

```bash
make novel
```

The generated site is self-contained in `novel/` and can also be opened
directly at `novel/index.html`.

Use a different port when needed:

```bash
make read PORT=9000
```

## Play the game

```bash
make game
```

This installs the game dependencies and starts Vite. Open the local URL printed
by Vite. See [`tycho-helium-fever/README.md`](tycho-helium-fever/README.md) for
controls and architecture.

## Verify everything

```bash
make test
make build
```

`make build` regenerates the novel HTML and creates the production game build.
