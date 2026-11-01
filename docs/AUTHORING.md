# Authoring conversations

## Minimal publication

Create `content/conversations/a-good-question.json`:

```json
{
  "schemaVersion": 1,
  "id": "a-good-question",
  "title": "A Good Question",
  "description": "A conversation worth keeping.",
  "date": "2026-11-01",
  "published": true,
  "participants": ["jonathan"],
  "messages": [
    {"id": "opening", "speaker": "jonathan", "body": "Where shall we begin?"}
  ]
}
```

`schemaVersion` is the content contract version, independent of story state versions. Unknown fields are rejected to catch typos. Optional publication fields: `tags` (strings), `cover` (image URL), `editorial` (plain text), `demo` (boolean), `status` (`complete` or `awaiting-source`), `avatars` (speaker ID → publication-specific image URL), and `story`. Dates must be real ISO calendar dates. Message IDs must be unique within a publication and should remain stable for permanent message links. Do not change a published conversation ID unless you also preserve its old URL.

Speaker IDs must exist in `content/speakers.json` and in the publication's `participants`. Consecutive messages by one speaker visually group, while each retains accessible attribution. Publication titles and the public collection name (`content/site.json`) are separate.

## Speakers and portraits

```json
{
  "reader": {
    "name": "A Reader",
    "description": "A short profile for future profile panels.",
    "accent": "#54766b",
    "shape": "circle",
    "avatar": "/assets/reader.webp",
    "avatarStatic": "/assets/reader-still.png"
  }
}
```

`name` is required; other fields are optional. Shapes: `circle` (default), `square`, `rounded`. Initials remain beneath the portrait and reappear if the image fails. Use high-resolution images (at least 128 × 128) for crisp portraits. For GIF, WebP, or APNG portraits supply `avatarStatic`; the build conservatively requires one for those extensions, including static WebP. Publication-specific avatars use the speaker's static fallback; use static publication overrides unless the registry fallback represents them accurately. Portraits are decorative beside a text attribution.

## Markdown and mathematics

Use normal Markdown for paragraphs, headings, lists, block quotations, links, images, tables and fenced code blocks. A known language after the opening code fence enables highlighting. Unknown languages display escaped plain code. Raw HTML is escaped, not executed. HTTPS and site-relative URLs are supported; protocol-relative, credential-bearing, unsafe protocols and parent-directory paths are rejected. Fragment links are supported. For inline images use descriptive alt text: `![A brass telescope](/assets/telescope.png)`.

Use `$E[X] = (n+1)/2$` inline, or `$$` on separate lines around a display equation. KaTeX renders at build time with trust disabled and includes MathML for assistive technology. Invalid formulas display a readable error rather than executing content.

## Attachments

Use the message `attachments` array. Two or more images naturally form a gallery. Every image requires `alt`; captions are optional.

```json
[
  {"type":"image", "src":"/assets/sky.png", "alt":"A cloudless night sky.", "caption":"After midnight."},
  {"type":"audio", "src":"/assets/bell.wav", "transcript":"A single bell fades into silence."},
  {"type":"video", "src":"/assets/sky.mp4", "poster":"/assets/sky.png", "captions":"/assets/sky.vtt", "transcript":"A silent sky gradually brightens."},
  {"type":"link", "url":"https://example.org/", "title":"A useful source", "description":"An editor-supplied preview."},
  {"type":"download", "src":"/assets/notes.txt", "title":"Field notes"},
  {"type":"embed", "src":"https://www.youtube-nocookie.com/embed/VIDEO_ID", "url":"https://www.youtube.com/watch?v=VIDEO_ID", "title":"A video"}
]
```

Native audio/video always includes a file link. Supply transcripts and captions for speech or meaningful audio. Video captions use local WebVTT files. The demo uses generated local samples. Full-size images remain ordinary links without JavaScript. The enhanced viewer closes with Escape or Close and restores focus.

Embeds are limited to `www.youtube-nocookie.com/embed/<id>` and `player.vimeo.com/video/<number>`. They load only after the reader requests them, in a sandbox with scripts, same-origin player functionality and presentation permitted. Provider links remain visible. Providers may forbid embedding or require cookies; the link is the reliable fallback. To support another provider, extend the renderer allowlist and CSP together and review its permissions.

URL preview metadata is supplied by the editor and rendered at build time. The generator intentionally does not crawl URLs: this avoids SSRF, tracking and unpredictable builds. No unrestricted cross-origin browser fetches occur.

## Emoji, stickers, reactions and effects

Unicode emoji work anywhere. Short emoji-only messages become oversized automatically. Register custom emoji in `content/emoji.json` with `src`, `static` and descriptive `alt`, then use `:identifier:` in Markdown. GIF, WebP and APNG assets work through normal image support. Always provide a static registry asset for reduced motion. A message's `sticker` is an emoji registry ID rendered large. `reactions` is an array of `{ "emoji": "✨", "count": 3 }` recorded reactions, not live visitor votes.

Optional effects: `glow` (quiet tint), `float`, `celebrate` (brief custom-emoji movements). Animation stops under reduced-motion preferences. Do not add effects to historical dialogue unless editorially appropriate. No proprietary emoji artwork is included.

## Dice

Add `"dice": "2d20kh1+3"` to a message. The immutable transcript displays the expression; readers may generate local rolls. The feature demo also has a collapsible editable roller. See [dice notation](DICE.md) for the exact grammar and limits.

## Declarative interactive stories

A `story` is an optional adaptation, never a replacement for message text:

```json
{
  "version": 1,
  "start": "door",
  "nodes": {
    "door": {
      "body": "A locked door. What next?",
      "actions": [
        {"label":"Knock", "to":"welcome", "set":{"polite":1}},
        {"label":"Try the lock", "roll":"1d20+2", "target":12, "pass":"welcome", "fail":"door"}
      ]
    },
    "welcome": {"body":"Welcome inside.", "actions":[]}
  }
}
```

A roll passes when its total is at least `target`. Choice actions use `to`. `set` assigns finite numeric variables. `when: {"variable":"polite","op":"=","value":1}` gates an action based on a previous choice; absent variables are zero. Operators: `=`, `<`, `<=`, `>`, `>=`. Combine sequences of gated nodes for compound conditions without per-story JavaScript. All destinations must exist. Node/variable IDs use letters followed by letters, numbers or underscores; prototype keys are forbidden.

Progress is stored locally under publication ID plus story version. Increase `story.version` when changing narrative structure to start a fresh session. Previous decision replays earlier steps and restores variables; Restart starts from the beginning. Every passage and destination also appears in a readable disclosure for no-JavaScript access. There is a 200-transition limit per session. Device-local saves and rolls are convenience features, not tamper-proof game records.

## Reading order between publications

Set optional `previous` and `next` fields to stable publication IDs. The build rejects self-links and links to missing or unpublished conversations. A `previous` link appears above the dialogue, and a `next` link appears at its end. Both are ordinary static links. Set both publications' fields to connect them in both directions. For example, A Celebration of Aspiration and Grandeur has `next: "logos-loves-learning"`, and Logos has `previous: "a-celebration-of-aspiration-and-grandeur"`.

## Permanent message links

Every message has a canonical UUID fragment, for example `/conversations/logos-loves-learning/#xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx`. Tap the `#` link beside any message to jump to it; copy its link (long-press on mobile) to share it. Grouped messages each retain their own link. The linked message is highlighted without JavaScript. Existing author IDs such as `#message-01` and `#welcome` remain working aliases.

Run `npm run ids` after adding messages to store their stable `uuid` fields in content. This command fills only missing UUIDs and never replaces existing ones. If a UUID has not yet been stored, the build derives a deterministic UUIDv5 from the publication ID and message ID, so ordinary builds and reordering cannot change the link. Storing it makes the identity independent of later author-ID edits. Optional explicit UUIDs must be valid lowercase UUIDs and globally unique. Keep both `uuid` and the old `id` unchanged when editing text or moving a turn in the conversation. Do not reuse a UUID for a different message; moving it to another publication still changes the URL path.
