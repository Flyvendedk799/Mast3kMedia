---
name: mast3kmedia-portfolio-case
description: >-
  Use when turning a repo URL and/or a live site URL into a Mast3kMedia
  portfolio entry or case study (Danish), from research and screenshots to
  upload, validation, preview, publishing and checking the live page.
---
# Mast3kMedia portfolio case

Turn a GitHub repo, a live URL or both into a published case on `https://mast3kmedia.dk/arbejde/<slug>`. Everything goes through the Mast3kMedia MCP (project tools). Field and endpoint reference: `docs/PORTFOLIO.md` in the repo.

## Non negotiables
- **All site content is Danish (da DK):** natural spoken Danish for a Copenhagen tech audience, following the Danish style sheet in the blog post writer skill. Technical terms Danish devs use (deploy, API, agent) are fine.
- **No em dashes, no en dashes and no double hyphens in prose.** Use commas, periods, parentheses or separate sentences. Use "til" for ranges ("2024 til 2026"). `validate_project` warns on dashes; fix every one.
- **Danish alt text on every image and a Danish caption where it adds something.** Alt text describes what is on screen ("Forsiden af Awaire med kursusoversigt på en bærbar"), not "screenshot".
- **Tobias's own projects are written in first person singular** ("jeg byggede", "min tilgang"). For client work, write what I delivered in first person and the client in third person.
- **Never invent anything:** no metrics, client results, testimonials, quotes, team members, awards or logos that are not documented in the repo, on the live site or given by Tobias. Leave the field empty instead. A `metrics` item needs a source you can point to.
- **Slugs are Danish ASCII:** æ becomes ae, ø becomes oe, å becomes aa, lowercase words joined by a hyphen (`kursusplads`, `faerdighedsmatrix`). Short and stable; never rename a published slug.
- **Draft first.** Publish only when Tobias says publish or "læg op", or when he explicitly asked for a published case.
- Use production HTTP MCP `https://mast3kmedia.dk/mcp` with Bearer `MCP_AUTH_TOKEN` so uploads land in production `uploads/`. Never print or commit the token.

## Open question for Tobias
Blog posts must never link to `/kontakt` or `/ydelser`. **Is a case page allowed to point readers to `/kontakt` or `/ydelser`** (for example a closing line like "Skal du have bygget noget lignende?")? Until Tobias answers, write no call to action in case text. The case template already has the site navigation and its own buttons; do not add more. Case text fields have no link syntax anyway (plain paragraphs, `**bold**` in `richtext` blocks).

## Workflow

### 1. Understand the project
- **Repo:** read the README, `package.json` (or the equivalent manifest), the top level folder structure and the main entry points. Note the real stack, what the product does, who it is for, notable technical choices and anything hard that was solved. Check the commit history for the timeline (first commit to launch) and the year.
- **Live site:** open it, click through the main flows and read the copy. Note what a visitor sees first and which screens show the product best.
- Ask Tobias (or note as a gap) for anything a case needs that the sources do not show: client name, role, results, a quote. Do not fill gaps with guesses.
- Call `describe_project_schema` for the current fields, Danish admin questions, categories, industries, block shapes, media roles and upload limits.

### 2. Capture media
- Screenshots of the live site at **1440 px** and **390 px** wide, in PNG, with any cookie banner dismissed and the page fully loaded. Take a hero shot (above the fold) and one or two feature shots per width. Full page captures only if the page is short.
- A short recording (5 to 15 seconds, no audio) when motion explains the product better than a still: a scroll through the landing page or one key flow. Capture frames with a headless browser and encode with ffmpeg to MP4 (H.264, `yuv420p`, `+faststart`) or WebM. Keep it under about 15 MB so it fits a base64 MCP upload.
- Never capture personal data, admin screens or anything behind a login unless Tobias approves.

Example with Playwright and ffmpeg:

```js
const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `hero-${width}.png` });
}
```

```bash
ffmpeg -y -framerate 12 -i frame-%03d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart scroll.mp4
```

### 3. Upload
- `upload_media` with `data` (base64), `filename` (Danish ASCII, descriptive: `awaire-forside-1440.png`), `sha256` (hex of the original file) and `bytes`. A mismatch means the transfer was corrupted; upload again.
- Images come back as WebP, max 2560 px wide. Use the returned absolute `url`.
- Files larger than the MCP limit (about 17 MB) go through REST `POST /api/admin/uploads` as a raw body with `X-Filename` and `X-Content-SHA256`.
- Uploads you end up not using: `delete_media`. It refuses while the file is referenced and tells you where.

### 4. Fill in the case
Create a draft with `create_project`, then refine with `update_project` (partial, so send only what changes).

| Field | What to write |
|-------|---------------|
| `title` | Product or project name, under 60 characters |
| `slug` | Danish ASCII, see above |
| `category` / `industry` | From the schema lists only |
| `year`, `client`, `role_scope`, `deliverables`, `timeline`, `services` | Facts from the sources; `client` is "Mast3kMedia" for my own products |
| `subtitle` | One sharp line under the heading, under 90 characters |
| `description` | Card text and meta description, about 160 characters, says what it is and for whom |
| `long_description` | Two to four sentences that open the case |
| `challenge` | Answers "Hvad var problemet eller udfordringen?" |
| `approach` | Answers "Hvordan løste vi det?" with concrete technical choices |
| `results` | Answers "Hvad opnåede projektet?" with documented effects only; describe what shipped if there are no numbers |
| `tags` | Two to four short labels |
| `tech_stack` | The real stack from the manifest and code, product names in their own casing |
| `thumbnail_url` | The 1440 hero shot |
| `og_image` | A 1200 by 630 crop if you have one, else leave empty so the thumbnail is used |
| `case_url` | The live URL |
| `media` | Items with `role` `hero`, `device-desktop` (1440 shot), `device-mobile` (390 shot), `feature`, `gallery` or `demo` (recording), each with Danish `alt` and `caption` |
| `metrics`, `testimonial_*`, `team`, `awards`, `client_logo` | Only when documented or given by Tobias |

Separate paragraphs in text fields with a blank line. Then call `set_blocks` for extra sections, for example a `timeline` of the build phases, a `gallery` of feature shots, a `video` block for the recording, or a `richtext` block on one interesting technical decision. Do not repeat the challenge, approach or results text in blocks.

### 5. Validate and preview
- `validate_project { ref }` returns `errors` and `warnings`. Fix every error. Fix warnings too unless there is a reason not to (a missing testimonial is fine when none exists).
- `preview_project { ref }` returns a signed link to the draft (noindex, expires after 24 hours by default). Open it at 1440 and 390 px and check: the hero loads, text reads naturally, nothing overflows at 390 px, images have the right crop, the video plays. Send the link to Tobias when he wants to review before publishing.

### 6. Publish and verify
- `publish_project { ref }` (and `set_featured` only if Tobias asks).
- Open `https://mast3kmedia.dk/arbejde/<slug>`: status 200, correct title and description in the head, one `og:image`, all images and the video load, no robots noindex.
- Check that the case appears on `https://mast3kmedia.dk/arbejde.html`.
- Report the URL, what was filled in, what was left empty and why, and any question for Tobias.

## Style checklist before publishing
- Every sentence Danish, read aloud in your head, no translationese.
- Zero em dashes, en dashes or double hyphens in any field, block, alt text or caption.
- First person for my own projects, no marketing fluff ("revolutionerende", "banebrydende").
- Every number, quote and client claim traceable to a source.
- Alt text and captions in Danish on every image.
- `validate_project` returns `ok: true`.

## Known gaps
- All image uploads become WebP. Some social platforms (LinkedIn in particular) have been unreliable with WebP previews. If a case will be shared there, ask Tobias whether a PNG or JPEG `og_image` hosted elsewhere is needed.
- Publishing is not blocked by validation errors, so always validate first.
