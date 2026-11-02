# Constellation Conversations

A framework-free, accessible library of curated conversations. Static HTML first; small JavaScript modules add optional interaction. **Maximum capability, minimum intrusion.**

## Run

Requires Node.js 22 or newer.

```sh
npm ci --ignore-scripts
npm test
npm run build
```

The portable site is in `dist/`. Serve that directory with any static web server. No CDN, accounts, backend, or API keys are needed. Optional authored story prompts use vendored rendering tools on demand. Use `BASE_PATH=/constellation-conversations npm run build` for the project GitHub Pages URL. Leave it empty for a domain root.

## Publish another conversation

1. Register speakers in `content/speakers.json` and copy assets into `public/assets/`.
2. Add a JSON file in `content/conversations/`, following [the authoring guide](docs/AUTHORING.md) and [the schema](content/schema.json). Write Markdown in each message's `body`.
3. Set `published: true`, run `npm run ids` then `npm run check`, and commit to `main`.
4. GitHub Actions tests, builds, and deploys to Pages. Publication URLs are `/conversations/<id>/`; keep IDs stable after publication.

The build generates the homepage as a welcome state, the sole published conversation, or a library according to the number of published items. There is no redirect. A demo counts as a published item; set its `published` field to false if only the inaugural publication should appear.

## Deployment

In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions** once. The workflow `.github/workflows/pages.yml` uses `npm ci`, runs tests, builds with the project base path, uploads only `dist`, and deploys on pushes to `main`. Pull requests run checks without deploying. After enabling Pages, rerun the workflow or push a commit. See [deployment and verification notes](docs/OPERATIONS.md).

## Files

- `content/`: site metadata, speaker/emoji registries, schema, publications
- `public/`: authored assets copied unchanged into the output
- `src/build.mjs`: validation, safe Markdown rendering, HTML generation
- `src/style.css`: responsive reading design, themes, reduced-motion and print rules
- `src/app.js`: theme, media viewing, dice controls, story UI
- `src/dice.js`: bounded dice parser and cryptographically random roller
- `src/branch.js`: declarative story validation, conditions, transitions, session replay
- `tests/`: engine, security, rendering, schema, output and homepage checks
- `docs/`: authoring, dice notation, security and operations

## Publication integrity

**Logos Loves Learning contains the final five exchanges supplied by the human participant.** Original wording, sequence, speaker attribution, paragraphs and conversational corrections are retained. Initials remain as portrait placeholders. The Observatory is clearly labeled original demonstration content. Do not replace historical transcripts with interactive adaptations; use the separate `story` field.

## Dependencies

Markdown-it (Markdown), KaTeX (accessible static math), highlight.js (build-time code highlighting), and Ajv (schema validation) are build-time tools. Versions and transitive packages are locked. KaTeX CSS/fonts and optional local composer renderers are copied into the output; the optional story-prompt editor loads local copies of Markdown-it and KaTeX on demand. Reading and dice do not load these runtime tools. Third-party licenses are retained in `dist/assets/vendor/`.
