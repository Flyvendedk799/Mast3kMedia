# Mast3kMedia — design improvements

**Site:** [https://mast3kmedia.dk/](https://mast3kmedia.dk/)  
**Date:** 20 Sep 2026  
**Scope:** Full site (Home, Ydelser, Priser, Arbejde, Case template, Open Source, SaaS, Om, Kontakt)  
**Reference case:** 99Expert (`case.html?slug=99expert`) — richest filled template  
**Severity bar:** Blockers first, then worth fixing. Minor notes only where they affect the system.

This document combines the full-site critique into one action list: what to keep, what to fix, and in what order. Screenshots are from the live desktop site (1280×800).

---

## 1. Verdict

The brand system is strong: near-black canvas, neon green accent, bold display type, mono labels, subtle grid. It already reads as a København kodebureau.

Trust and proof leak in three places:

1. Broken or empty UI states (filters, metric slots, placeholder phone).
2. Inconsistent case data across homepage, Arbejde, and case pages.
3. A case template that looks complete on 99Expert but is only half-filled on thinner cases.

**Design goal:** Keep the visual language. Make every page feel finished, and make **Arbejde / Cases** the clearest proof that you ship real products.

---

## 2. What to keep

| Pattern | Why it works |
|---|---|
| Dark + neon green + white hierarchy | Instant brand recognition, strong CTA contrast |
| Homepage hero (“Mindre snak. Mere kode. Rigtig vækst.”) | Clear promise, scannable in one glance |
| Sticky “Start projekt” CTA | Conversion path is always available |
| Priser 5-step estimator | Best conversion pattern on the site |
| Kontakt multi-step brief + side panel | Low friction, human tone |
| 99Expert case section order | Best template spine for all cases |

![Homepage hero](images/01-home-hero.png)

*Figure 1 — Homepage hero: hierarchy and CTA are already right.*

![Priser configurator](images/10-pris.png)

*Figure 2 — Priser: product-type cards and “Videre” flow are a keeper.*

---

## 3. Blockers (fix first)

### 3.1 Arbejde — AI filter returns zero

Selecting **AI** shows “Ingen cases matcher” / 0 projekter while an **AI** tag still appears in the chip cloud. That reads as broken, not empty.

![Arbejde AI empty state](images/04-arbejde-ai-empty.png)

*Figure 3 — AI category selected, zero projects. Taxonomy bug.*

**Fix**

- One taxonomy: category pills and tags must share the same mapping.
- Never show a primary filter that always yields zero.
- Empty state should offer “Vis alle” / clear filters, and ideally deep-link to tagged AI work.

---

### 3.2 Placeholder phone number

`+45 00 00 00 00` appears on Kontakt (and footer). On a site that sells “rigtige mennesker,” a fake number kills trust.

![Kontakt with placeholder phone](images/11-kontakt.png)

*Figure 4 — Kontakt brief works; phone row does not.*

**Fix**

- Put a real number, or remove the Telefon row until you have one.
- Same for every footer instance.

---

### 3.3 Case inventory doesn’t match itself

Homepage “Senest leveret” / older copy names (e.g. NordSync) do not always match live Arbejde cases (Awaire, WGaming, 99Expert, …). Om / marquees can drift the same way.

**Fix**

- One CMS source of truth for project title, year, thumbnail, and “latest.”
- Homepage latest card = latest published case from the same API as Arbejde.

---

### 3.4 Case results strip leaves an empty cell

On 99Expert, RESULTATER is a 3-column bar with only two metrics (`7500+`, `200+`). The blank third cell looks unfinished.

![Empty third metric cell](images/06-case-results-empty.png)

*Figure 5 — Two metrics in a three-column shell.*

**Fix**

- Render *N* columns for *N* metrics, or require a third metric before publish.
- Never reserve empty slots in the template.

---

### 3.5 Results chart fights the data

Produkter (~7.500) vs Foredragsholdere (~200) on one axis makes the second bar a stub. The chart undermines the smaller number.

![Misleading scale chart](images/07-case-chart.png)

*Figure 6 — Same-axis bar chart for incomparable magnitudes.*

**Fix**

- Prefer equal metric cards.
- Use a chart only when scales are comparable (or use separate axes / normalized view).

---

## 4. Cases system (Arbejde + case template)

You already have the right IA: nav **Arbejde**, homepage **Alle cases**, case URLs. The gap is polish and a locked template — not a missing section.

### 4.1 Arbejde index

![Arbejde filters and grid](images/03-arbejde-filters.png)

*Figure 7 — Strong IA; filter cloud is dense and low-contrast.*

![Homepage featured cases](images/02-home-cases.png)

*Figure 8 — Featured cases look premium; path to all eight should be louder.*

**Improvements**

| Issue | Fix |
|---|---|
| Dense tech/tag cloud | Collapse secondary tags behind “Flere filtre”; keep ~5–6 primary categories visible |
| Cards lead with category + year | Add one outcome line on each card (metric or result) |
| Homepage shows `01 / 08` but only two big cards | Stronger “Alle cases →” or denser grid below the feature pair |
| SaaS page vs Arbejde | Label clearly: Arbejde = client/partner work, SaaS = products you own |

---

### 4.2 Case template — lock to 99Expert

99Expert is the reference: real client, challenge/approach, metrics, product shot, stack, testimonial, related, next.

![99Expert hero](images/05-case-99expert-hero.png)

*Figure 9 — 99Expert hero: good title system; intro is too long above the fold; tags mix category + features + year.*

![Stack and testimonial](images/08-case-stack-quote.png)

*Figure 10 — Stack + client quote: keep as required when available.*

![Related cases uneven heights](images/09-case-related.png)

*Figure 11 — Related thumbs work; long MyMetaView blurb breaks the grid.*

#### Locked section order (publish checklist)

1. Breadcrumb  
2. Category · Year · Status *(not a feature-tag dump)*  
3. Title + **short** one-liner  
4. Meta: Klient · Ydelser · År · Live *(optional)*  
5. Hero product shot  
6. Udfordringen / Tilgangen *(required, client-facing)*  
7. Results: 2–4 labeled metrics; no empty cells; chart only if scales match  
8. 2–3 screenshots with captions  
9. Stack  
10. Testimonial *(when allowed)*  
11. Related (3 cards, line-clamped) + Næste case  

#### Template field rules

| Field | Rule |
|---|---|
| Hero copy | Short `description` (1–2 lines). Move `long_description` below first screenshot |
| Hero tags | Category · Year · Status only. Features elsewhere. Stack in STACK |
| Ydelser | Dedicated `services` field — do not pipe raw feature tags |
| Klient | Real client name, or badge **Eget produkt** / **Internt** |
| Live | `case_url` or hide Live column |
| Challenge / Approach | Grammar-checked; outcomes for the client, not “database skema” |
| Metrics | Every number needs a label; prose must match metric values (e.g. 100 vs 200+ speakers) |
| Related | Line-clamp descriptions to 1–2 lines; always show thumbnails |
| Thinner cases (Awaire, WGaming) | Fill up to 99Expert’s bar — do not ship screenshot-only cases |

---

## 5. Rest of the site

### Home

- Keep hero and featured case pair.
- Sync “Senest leveret” with live Arbejde data.
- Make “Alle cases” impossible to miss.

### Ydelser

![Ydelser](images/12-ydelser.png)

*Figure 12 — Clear service hierarchy; page feels sparse.*

- Tighten vertical rhythm between service blocks so “Book et møde” arrives sooner.
- Keep 01–04 numbering and collaboration models.

### Priser

- Keep the five-step estimator and “fra €…” anchors.
- Make **Videre** disabled vs ready states obvious (muted green currently looks half-active).
- Keep estimate reveal at the end.

### Open Source

- Keep as trust signal for a code bureau.
- Do not let it steal nav weight from Arbejde.

### SaaS

![SaaS hero](images/13-saas.png)

*Figure 13 — “Software vi ejer selv” is a sharp story — keep separate from client cases.*

- Keep MRR / status labels.
- Badge own products clearly so they are not confused with Arbejde cases.

### Om os

- Narrative and values land.
- Team grid: show filled roles only, or mark open seats honestly.
- Client marquee must match Arbejde names.

### Kontakt

- Keep four-step brief + status panel (svartid, gratis møde, kapacitet).
- Inline validation works.
- Align project-type labels with Priser (same language in both funnels).
- Fix phone (see blockers).

---

## 6. Site-wide design system

### Navigation

Seven items + CTA is crowded. Consider grouping **Open Source + SaaS** under **Produkter** so **Arbejde** stays the proof of work.

### Accessibility

| Issue | Fix |
|---|---|
| Grey mono labels / chip borders | Bump label grey lightness or type size |
| Dense filter chips | Fewer visible chips; larger hit targets |
| Sticky nav overlapping headings | Add `scroll-margin-top` on section anchors; consider thinner sticky bar |
| Chart axis labels | Higher contrast or drop the chart |

Primary white/green on black is fine. The weak zone is secondary grey and dense chrome.

### Language

Danish UI with English product/tech terms is fine. Keep naming consistent per page (`99Expert` vs `99ekspert` / `99expert` in body copy).

### Content honesty

- No placeholder contact data.
- No metrics without labels.
- No filters that always empty.
- No “latest project” that isn’t in Arbejde.

---

## 7. Recommended fix order

### Week 1 — trust

1. Fix Arbejde AI filter / taxonomy.  
2. Replace or remove `+45 00 00 00 00`.  
3. Sync homepage latest + Om marquee with Arbejde API.  
4. Collapse empty metric cells; kill or replace the misleading case chart on 99Expert.

### Week 2 — cases template

5. Rewrite 99Expert challenge/approach (grammar + outcomes).  
6. Hero short description; long story below first shot.  
7. Proper `services` + optional `case_url`.  
8. Line-clamp related cards; add 1–2 more screenshots with captions.  
9. Bring Awaire / WGaming up to the locked checklist.

### Week 3 — polish

10. Collapse Arbejde secondary filters.  
11. Outcome line on Arbejde cards.  
12. Tighten Ydelser spacing.  
13. Clarify SaaS vs Cases in nav/labels.  
14. Priser Videre state clarity; Kontakt ↔ Priser taxonomy alignment.  
15. Sticky-nav scroll-margin + secondary contrast pass.

---

## 8. Success check

The site is “done enough” when:

- [ ] No primary filter returns a false empty state.  
- [ ] No placeholder phone or fake contact.  
- [ ] Homepage latest case === a real Arbejde case.  
- [ ] Every published case passes the 99Expert checklist.  
- [ ] Metric strips never show empty cells.  
- [ ] Related case cards share equal height.  
- [ ] A first-time visitor can go Home → Arbejde → one case → Kontakt without hitting a broken or unfinished block.

---

## Appendix — pages reviewed

| Page | URL |
|---|---|
| Home | `/` / `index.html` |
| Ydelser | `ydelser.html` |
| Priser | `pris.html` |
| Arbejde | `arbejde.html` |
| Case (template) | `case.html?slug=…` |
| Case reference | `case.html?slug=99expert` |
| Open Source | `oss.html` |
| SaaS | `saas.html` |
| Om | `om.html` |
| Kontakt | `kontakt.html` |

Screenshots captured desktop-width from the live site on 20 Sep 2026. Findings are based on what was visible on screen and in the projects API — no invented measurements or hex values beyond observed brand behaviour (near-black, neon green, white, muted grey).
