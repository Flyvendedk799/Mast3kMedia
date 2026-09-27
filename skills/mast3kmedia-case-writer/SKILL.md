---
name: mast3kmedia-case-writer
description: >-
  Use when writing a Danish client case or portfolio case for mast3kmedia.dk
  from a live URL, a repo and Tobias's own facts, to get a well-structured case
  in the shared Mast3kMedia voice that never invents results, quotes or metrics.
---
# Mast3kMedia case writer

**Read `skills/mast3kmedia/SKILL.md` first.** Voice, style sheet, hard rules, checklist and MCP setup live there. This skill covers the case writing. The mechanics (schema, media capture, upload, validation, preview, publish) live in `skills/mast3kmedia-portfolio-case/SKILL.md`; follow it and don't duplicate it. The repo (`lib/casework.js` FIELDS, `docs/PORTFOLIO.md`, `admin/index.html`) wins over both skills.

## Facts first
A case is a claim about real work for a real client. These rules beat every style rule.
- **Results:** only numbers Tobias gave or that are documented on the live site or in the repo. No numbers means describing what shipped and what it now makes possible.
- **Quotes:** verbatim as supplied, with the name and role supplied. Never translated or tidied. No quote, no block, no placeholder.
- **Client:** named only if Tobias confirmed it may be, spelled exactly as given. Otherwise generic ("en dansk SaaS-virksomhed").
- **Scope:** only what Tobias actually did. Unknown year or timeline stays out.
- **Trace every claim** privately to live site, repo or Tobias. No source means cut it or ask.

## Research
1. **Live URL:** use it like a visitor. What it is, who it is for, what shows first, which flows matter.
2. **Repo:** README, manifest, folder structure, entry points, commit history (real stack, integrations, hard problems, first commit to launch).
3. **Tobias:** one message with every question only he can answer: client name and whether it may be shown, role and scope, year and timeline, real results, a real testimonial with name and role, team. Unanswered means empty.
4. **Screenshots and videos:** capture and upload per the portfolio-case skill (1440 and 390 px, short MP4/WebM, no personal data or admin screens).

## The arc
1. **Klienten:** who they are and what they do, in one or two sentences.
2. **Udfordringen:** the concrete situation before. Not a generic pain point.
3. **Løsningen:** what was built and how, with the specific choices and why they fit this client.
4. **Resultatet:** what changed, documented effects only.

Find the one interesting decision (a trade-off, a constraint, something harder than expected). It often earns its own `richtext` block. Open on the client's situation, end on what the client can do now.

## Admin case fields
All text fields are plain text: a blank line starts a paragraph. No markdown, HTML, tables or bullets (`**bold**` only inside richtext and timeline blocks).
- `subtitle`: one sharp line, max 90 characters. `description`: about 160 characters, what it is and for whom.
- `long_description`: two to four sentences opening the case (Klienten).
- `challenge` answers "Hvad var problemet eller udfordringen?" (Udfordringen).
- `approach` answers "Hvordan løste vi det?" with concrete choices (Løsningen).
- `results` answers "Hvad opnåede projektet?" (Resultatet).
- Key facts go in structured fields (`client`, `industry`, `year`, `timeline`, `role_scope`, `deliverables`, `services`, `tech_stack`), briefly, not repeated in prose.
- `metrics` as `{value, label}` with a short Danish label, only with a source. `testimonial_*`, `team`, `awards`, `client_logo` only when given.
- Blocks add structure the fields can't carry; never repeat challenge, approach or results in them.
- Media: Danish `alt` for what is on screen and a Danish `caption` where it adds something.

## Short examples
> Kunderne kunne kun booke tider over telefonen. Det betød, at receptionen brugte det meste af formiddagen på at flytte aftaler rundt.

> Jeg overvejede en fuld app, men valgte en webløsning, fordi de fleste kunder kom ind via et link i en sms.

> I dag booker kunderne selv, også uden for åbningstid, og receptionen kan se alle aftaler samlet ét sted.

Hand off to the portfolio-case skill for draft, `validate_project`, preview and publish.
