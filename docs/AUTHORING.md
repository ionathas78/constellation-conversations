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
    "role": "human",
    "description": "A short profile for future profile panels.",
    "accent": "#54766b",
    "shape": "circle",
    "avatar": "/assets/reader.webp",
    "avatarStatic": "/assets/reader-still.png"
  }
}
```

`name` is required; other fields are optional. Set `role: "human"` for a human participant to render their messages on the right with a subtle tinted panel, a right-side avatar, and a Human label. Other speakers keep the standard conversation layout. Text always stays left-aligned for readability. Shapes: `circle` (default), `square`, `rounded`. Initials remain beneath the portrait and reappear if the image fails. Use high-resolution images (at least 128 × 128) for crisp portraits. For GIF, WebP, or APNG portraits supply `avatarStatic`; the build conservatively requires one for those extensions, including static WebP. Publication-specific avatars use the speaker's static fallback; use static publication overrides unless the registry fallback represents them accurately. Portraits are decorative beside a text attribution.

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

A roll passes when its total is at least `target`. Choice actions use `to`. `set` assigns finite numeric variables or text of at most 2,000 characters. Text conditions support exact equality (`=`); ordered comparisons remain numeric. `when: {"variable":"polite","op":"=","value":1}` gates an action based on a previous choice; absent variables are zero. Operators: `=`, `<`, `<=`, `>`, `>=`. Combine sequences of gated nodes for compound conditions without per-story JavaScript. All destinations must exist. Node/variable IDs use letters followed by letters, numbers or underscores; prototype keys are forbidden.

Progress is stored locally under publication ID plus story version. Increase `story.version` when changing narrative structure to start a fresh session. Previous decision replays earlier steps and restores variables; Restart starts from the beginning. Every passage and destination also appears in a readable disclosure for no-JavaScript access. There is a 200-transition limit per session. Device-local saves and rolls are convenience features, not tamper-proof game records.

## Reading order between publications

Set optional `previous` and `next` fields to stable publication IDs. The build rejects self-links and links to missing or unpublished conversations. A `previous` link appears above the dialogue, and a `next` link appears at its end. Both are ordinary static links. Set both publications' fields to connect them in both directions. For example, A Celebration of Aspiration and Grandeur has `next: "logos-loves-learning"`, and Logos has `previous: "a-celebration-of-aspiration-and-grandeur"`.

## Permanent message links

Every message has a canonical UUID fragment, for example `/conversations/logos-loves-learning/#xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx`. Tap the `#` link beside any message to jump to it; copy its link (long-press on mobile) to share it. Grouped messages each retain their own link. The linked message is highlighted without JavaScript. Existing author IDs such as `#message-01` and `#welcome` remain working aliases.

Run `npm run ids` after adding messages to store their stable `uuid` fields in content. This command fills only missing UUIDs and never replaces existing ones. If a UUID has not yet been stored, the build derives a deterministic UUIDv5 from the publication ID and message ID, so ordinary builds and reordering cannot change the link. Storing it makes the identity independent of later author-ID edits. Optional explicit UUIDs must be valid lowercase UUIDs and globally unique. Keep both `uuid` and the old `id` unchanged when editing text or moving a turn in the conversation. Do not reuse a UUID for a different message; moving it to another publication still changes the URL path.

## Optional local feedback

Set `feedback: true` on a publication to offer an unobtrusive Add a thought disclosure and Reply locally controls. A reader can preview Markdown, math and registered emoji, add a thought or prompt, reply to published or local messages, and reset all local feedback. Source dialogue never changes. There is no AI response generation, submission endpoint or publishing action.

The serialized session is documented by `content/feedback-schema.json`; relationship, total-size and timestamp checks live in `src/feedback-state.js`. Local messages use the same `body`, `speaker` and `uuid` fields as display messages, with `threadUUID`, nullable `replyTo`, and `createdAt`. Their speaker is the session-only `session-reader`, displayed as You. Replies share the root thread UUID; separate new thoughts create separate thread UUIDs. Session-only message links are useful within that tab and do not resolve for another reader.

State is bounded to 100 messages, 20,000 characters per message and 250,000 total characters, and kept in `sessionStorage` under publication ID and version. It survives refreshes in the same tab; tab closure normally ends the session, subject to browser tab-restoration behavior. Storage failures allow in-memory use for the visit. Reset clears feedback and drafts while leaving dice, story progress and the published conversation alone.

The shared safe Markdown renderer is used for publication and local preview/display. Local copies of pinned Markdown-it and KaTeX load only when formatting a draft or restoring saved feedback. No CDN or external AI service is involved. Raw HTML stays inert; code blocks display safely without build-time syntax colors. Explicitly authored HTTPS image/media links may contact their hosts when rendered, as in the published reader. Avoid private information in external URLs.

## Text-entry actions in interactive passages

A text prompt is an authored story action alongside choice or dice actions. It is not general feedback on a historical transcript. None of the supplied publications enables general feedback by default.

```json
{
  "label": "Leave my question",
  "input": {
    "variable": "question",
    "label": "Your question for the observatory",
    "placeholder": "Write a question. Markdown is welcome.",
    "maxLength": 2000
  },
  "to": "recorded"
}
```

The editor appears only at a node declaring this action. Preview uses the same safe Markdown/math/emoji renderer as messages. Submit records a human response, assigns message/thread/reply UUIDs, writes its text to the declared variable, and advances to `to`. It does not call an AI service or invent a response. Authors declare subsequent passages and conditions. A text-input action cannot also roll dice. Its input variable is assigned after any `set` values.

Responses appear above the current passage in human-message styling. Later responses in that story share a thread and reply to the preceding response. Previous decision restores an input as an editable draft and rolls back its variable; Replay produces a new response UUID. Restart removes the responses and drafts. Stories containing text-entry actions use tab-scoped `sessionStorage` for all progress and responses, surviving refresh in that tab without publishing. Other stories retain the existing device-local storage behavior. Local response UUIDs do not create publicly shareable transcript messages. Increase the story version when changing action structure.

In The Observatory demonstration: Knock → Leave a question in the notebook → write or preview a question → Leave my question. The original choice and dice paths remain available.
