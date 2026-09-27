---
name: mast3kmedia-blog-writer
description: >-
  Use when writing or publishing a Danish blog post on mast3kmedia.dk from a
  brain dump, a news link or a project, to get a polished, well-formatted post
  in the shared Mast3kMedia voice, published through the blog MCP tools.
---
# Mast3kMedia blog writer

**Read `skills/mast3kmedia/SKILL.md` first.** Voice, style sheet, hard rules, checklist and MCP setup live there and are not repeated here. This skill adds only what is specific to blog posts. Reference: `docs/BLOG.md`.

## Blog rules
- Every post has a cover image and at least one image in the body, each with Danish alt text.
- News posts carry no company pitch. For Tobias's own projects, no dedicated "svagheder" section.
- Facts first, then opinion. Mark the switch clearly inside the section (an italic opening sentence or folded into the first paragraph of the assessment), not as a lonely one-liner.
- Put the full picture early: if a product lineup matters (flagship, siblings, a missing model), establish it in the first paragraphs.

## Process
1. **Take the input as it comes.** Brain dump, news link or repo. English input still becomes Danish.
2. **Find the story.** A move from one understanding to another, or problem to resolution. News skips the arc and leads with what happened and why it matters.
3. **Pick a structure.**
   - Experience: problem, journey, results, lessons.
   - Project: setup, challenge, discovery, application.
   - News: what happened, what's new, numbers, availability, what it means, assessment.
4. **Write.** Open on a current position or event with a tension. Never a definition. End by tying back to the opening with something actionable.
5. **Format** with at least two tools from the toolbox beyond paragraphs and headers.
6. **Review** with the checklist in `/mast3kmedia`, then publish per Tobias's instruction and iterate.

## Formatting toolbox
The renderer (`assets/blog-markdown.js`) supports all of these.
- **Headers:** `##` for sections, `###` for subsections, never skip levels. The title is the only `<h1>`.
- **Tables** for 2+ items across 3+ attributes. Narrow (2 to 3 columns), units in the header, one interpreting sentence after.
- **Bullets with bold lead-ins** for parallel items: `- **API:** …`. Max around 7 per list, prose between lists.
- **Code** for every model id, parameter, command and path: `reasoning_effort`, `~/.codex/auth.json`. Fenced blocks for real usage.
- **Key-facts box** near the top of news: "**Det vigtigste:**" plus 3 to 5 bullets (date, price, availability).
- **Blockquote** for an attributed source quote or one key takeaway. **Bold** for the one number per section that matters.
- **Image with caption:** `![alt](/uploads/…)` with an italic line directly under it.
- **Divider** (`---`) between facts and an opinion section; **FAQ** as H2 with question H3s when readers will ask.

A table or list supports the analysis, it never replaces it.

## Short examples
Opening hook:
> "AI kommer til at erstatte udviklere."
> Den sætning må jeg have hørt hundrede gange det seneste år.

Emphasis through structure:
> Så faldt tiøren.
> Jeg så den bruge `rg` til at søge i kodebasen, præcis som jeg selv ville have gjort.

Comparison table:
| Model | Input pr. mio. tokens | Output pr. mio. tokens |
| :--- | ---: | ---: |
| Model A | 2 dollar | 10 dollar |
| Model B | 0,10 dollar | 0,50 dollar |

Switch to opinion:
> *Min vurdering:* Prisen er det mest interessante, ikke benchmarkene.

## Publishing (MCP)
1. `blog_upload_media` for the cover, then for body images (base64 `data`, Danish ASCII `filename`, optional `sha256` and `bytes`). Use the relative `url` (`/uploads/…`) in the body.
2. `blog_list_categories` to pick an existing `category` slug.
3. `blog_create_post` (or `blog_update_post`) as draft with `title`, `slug`, `excerpt`, `body` (markdown), `cover_image`, `cover_alt`, `seo_title` (max 60 characters), `seo_description` (120 to 155 characters), `tags`, `category`. `blog_set_cover` changes the cover later.
4. `blog_publish_post` only on "publish" or "læg op". `blog_unpublish_post` returns it to draft.
5. Verify with `blog_get_post` and the public page `https://mast3kmedia.dk/blog/<slug>`: images load, tables fit at 390 px.
