# Mast3kMedia Design System

Dark-first, neon-accented brand system for **Mast3kMedia** — a full-service digital agency and software studio. Clean, minimal, precision-engineered.

> **For AI use:** Read this file fully before generating any visuals. All CSS token names are defined in `tokens/`. Never guess token names.

---

## Company Overview

**Mast3kMedia** is a digital agency & software studio. Services: web development, mobile apps, UI/UX design, AI & automation, video/media production, SaaS, digital marketing, branding & identity.

**Brand tone:** Clean, minimal, bold, tech-forward, dark-first.  
**Website:** mast3kmedia.com

## Sources

This design system was built from the following materials (all in `design-system/` local folder):

| File | Description |
|------|-------------|
| `design-system/Brand Guidelines.html` | Full brand identity system — logo, color, type, applications, patterns, usage rules |
| `design-system/components.html` | Component reference — buttons, badges, cards, inputs, nav, alerts, avatars, tables, code, progress |
| `design-system/tokens.css` | All CSS custom properties (source of truth) |
| `design-system/README.md` | Brand documentation and AI usage guide |
| `design-system/logo.svg` | Official M mark SVG |

> Figma file: not provided. GitHub repo: not provided. Only the `design-system/` local folder was supplied.

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Bold and technical.** Copy reads like engineers who also understand design — confident, direct, no fluff.
- **No emoji.** Strictly off-brand in any UI context.
- **Declarative headlines.** Short, punchy. Often one or two words: *"Build. Launch."*
- **Sentence case for body.** Title Case for display headlines only.
- **ALL CAPS for labels.** JetBrains Mono + letter-spacing + uppercase for nav links, section labels, form labels, badges, captions.
- **First-person "we".** The agency speaks as a collective: "We craft", "We build", "Our work".
- **Section labeling pattern.** `01 — Section Name` in mono font, followed by a short green rule.
- **The brand signature.** `MAST3KMEDIA` — the digit **3** is always rendered in Neon Mint (#00FF88).

### Copy Examples
- **Hero headline:** *"Build. Launch."* or *"Digital Agency & Studio"*
- **Hero body:** *"From first concept to live deployment, we craft digital products that drive real impact — beautifully engineered, obsessively refined."*
- **CTA buttons:** *"Start a Project"*, *"Get Started"*, *"View Code"*, *"Explore"*
- **Section labels:** *"01 — Brand Identity"*, *"02 — Color System"*, *"03 — Typography"*
- **Service names:** *"Web Development"*, *"AI & Automation"*, *"UI/UX Design"*, *"Mobile Apps"*
- **Badge copy:** *"Live"*, *"In Progress"*, *"Draft"*, *"Review"*

### Casing Rules
| Context | Case | Font |
|---------|------|------|
| Hero / display headlines | Title Case | Space Grotesk 700 |
| Body paragraphs | Sentence case | DM Sans 400 |
| Nav links, labels, badges, tags | ALL CAPS | JetBrains Mono |
| Section markers | `01 — Name` | JetBrains Mono |
| Button text | Title Case | Space Grotesk 600 |

---

## VISUAL FOUNDATIONS

### Colors
- **Always dark backgrounds** — `#07070A` Void is the default canvas; light backgrounds are exception only (e.g. logo-on-light demo).
- **Surface stack** (elevation): `#07070A` → `#0E0E14` → `#16161E` → `#1E1E28` — progressively lighter for cards, hover states, active states.
- **Primary accent:** `#00FF88` Neon Mint — used for ONE dominant interactive element per screen. Never diluted.
- **Secondary accent:** `#00CFFF` Electric Cyan — links, data visualizations, secondary buttons, supporting elements. Always subordinate to Mint.
- **Text hierarchy:** `#FFFFFF` primary, `#E8E8F0` off-white for secondary headings, `#6A6A82` slate for captions/muted.
- **Rule:** Never use both accents at equal visual weight — Mint leads, Cyan supports.
- **Avoid:** Any other neon colors (pink, orange, yellow).

### Typography
- **Display / Headlines:** Space Grotesk — geometric, modern, high-impact. All sizes 20px+ use this.
- **Body / UI text:** DM Sans — clean, readable, neutral. All running text uses this.
- **Labels / Code / Technical:** JetBrains Mono — always uppercase + letter-spacing for labels; natural case for code. Used at 9–13px.
- **Never use:** Inter, Roboto, Arial — explicitly off-brand.
- **Type scale:** 80px display → 48px H1 → 32px H2 → 24px H3 → 20px H4 → 18px body-lg → 16px body → 14px small → 11px label → 10px caption.

### Backgrounds & Patterns
- Three brand background textures — always at low opacity, never overpowering content:
  1. **Dot Grid:** `radial-gradient` dots, 24px grid, `rgba(0,255,136,.22)`.
  2. **Line Grid:** cross-hatch 32px, `rgba(0,255,136,.1)`.
  3. **Diagonal:** `repeating-linear-gradient` -45°, 19px, `rgba(0,255,136,.07)`.
- Hero backgrounds use subtle radial green/cyan gradients at ≤6% opacity.
- Fine 72px white grid overlay at `rgba(255,255,255,.018)` creates depth without competing.

### Animations & Motion
- **Brand easing:** `cubic-bezier(.16,1,.3,1)` — smooth, decisive, slight overshoot. Used for all spring animations.
- **Durations:** 150ms fast / 200ms base / 350ms slow / 400ms spring.
- **Entrance pattern:** `opacity: 0 + translateY(22px)` → natural, staggered with `0.12s` offsets.
- **Logo entrance:** `scale(.75) + translateY` → 1.1s spring.
- **Wordmark entrance:** letter-spacing expands wide then snaps closed.
- **No infinite decorative loops.** All motion is purposeful.

### Hover & Press States
| Element | Hover | Press |
|---------|-------|-------|
| Primary button | `#1AFFAA` bg + shadow-green + translateY(-1px) | translateY(0), no shadow |
| Cards | bg surface→surface-2, border tint green, shadow-green | — |
| Nav links | color: muted → green | — |
| Tags | border + text → green | — |
| Inputs | border → muted | border → green + glow |
| Icon buttons | border + color → green | — |

### Shadows & Elevation
- Scale: `1px` subtle → `4px` card → `16px` modal → `32px` floating.
- **Neon glows** (`shadow-green`, `shadow-cyan`) used on focus, hover, featured states — sparingly but memorably.

### Borders & Radius
- **Default:** `1px solid #28283A` — minimal dark borders everywhere.
- **Accent:** `1px solid #00FF88` — focus states, featured cards, active elements.
- **Radius:** `4px` badge → `8px` input/dropdown → `12px` card → `20px` icon → `9999px` pill.
- Buttons: full pill (`9999px`). Cards: `12px`. No sharp corners anywhere.

### Cards
- Background: `#0E0E14` (surface), `1px solid #28283A` border, `12px` radius.
- Hover: bg → `#16161E` + border → `rgba(0,255,136,.2)` + shadow-green glow.
- **Accent variant:** 2px gradient top edge (green→cyan), border `rgba(0,255,136,.25)`.
- **Stat variant:** Large number in Neon Mint, mono caption below.

### Layout
- Max width: `1320px`. Content width: `760px`. Nav height: `64px`.
- 4px base grid: `space-1=4px` → `space-10=128px`.
- Sticky nav: `backdrop-filter: blur(24px)`, background `rgba(7,7,10,.85)`, bottom border.

### Transparency & Blur
- Frosted glass (`blur(24px)`) used **only on navigation** — not on cards or panels.
- Semi-transparent fills: `rgba(0,255,136,.06-.1)` for badge/button backgrounds, tinted borders.
- Patterns always at low opacity so content reads cleanly through.

### Imagery
- No photography style guide defined in brand materials.
- Patterns and gradients replace photography in brand applications (banners, cards).
- Social banners use the dot-grid pattern as textured background.

---

## ICONOGRAPHY

- **No icon library** is specified in the brand guidelines.
- **No icon font.** Icons in the component reference are hand-crafted inline SVGs.
- **Style:** 24×24px viewport, `stroke="currentColor"`, `stroke-width="2"–"2.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"` — matches Lucide / Heroicons outline style.
- **Production recommendation:** Use **Lucide Icons** CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`
- **No emoji in UI** — ever.
- The `assets/logo.svg` M mark is the only official logo asset.

### Logo Mark SVG Path
```svg
<svg viewBox="0 0 100 100" fill="none">
  <path d="M14 84 L14 16 L50 52 L86 16 L86 84"
    stroke="#00FF88" stroke-width="11"
    stroke-linejoin="miter" stroke-linecap="butt"/>
</svg>
```
On light backgrounds: `stroke="#07070A"`. On green background: `stroke="#07070A"`.

---

## Index

### Foundation
| File | Description |
|------|-------------|
| `styles.css` | CSS entry point — `@import` list only, link this in any project |
| `tokens/fonts.css` | Google Fonts CDN + `--font-*` and `--weight-*` tokens |
| `tokens/colors.css` | Brand, neutral, semantic color tokens |
| `tokens/typography.css` | Type scale, line-heights, letter-spacing |
| `tokens/spacing.css` | 4px spacing scale + border-radius tokens |
| `tokens/effects.css` | Shadows, borders, transitions, z-index, patterns, layout |
| `tokens/base.css` | Reset + utility classes (`.m3k-body`, `.m3k-label`, `.m3k-wordmark`, etc.) |

### Assets
| File | Description |
|------|-------------|
| `assets/logo.svg` | M mark — primary dark-bg version, stroke #00FF88 |

### Guidelines (Design System tab)
Specimen cards grouped by concern. All in `guidelines/`.

**Colors:** `accent-colors`, `neutral-scale`, `text-colors`, `semantic-colors`, `shadow-elevation`, `neon-glows`  
**Type:** `type-display-family`, `type-body-family`, `type-mono-family`, `type-scale`  
**Spacing:** `spacing-scale`, `radii`, `borders`, `transitions`  
**Brand:** `patterns`, `logo-mark`, `wordmark`

### Components (Design System tab → Components)
| Directory | Components |
|-----------|-----------|
| `components/core/` | Button, Badge, Tag, Card, Avatar |
| `components/forms/` | Input, Select |
| `components/feedback/` | Alert, Progress |
| `components/navigation/` | Nav |

### UI Kits (Design System tab → Agency Website)
| File | Description |
|------|-------------|
| `ui_kits/agency-website/index.html` | Interactive agency website — hero, services, work, contact, footer |

---

## Notes & Caveats

- **Fonts** are served via Google Fonts CDN. For offline/self-hosted use, download and host: Space Grotesk, DM Sans, JetBrains Mono.
- **Icons:** No icon system is bundled. Use Lucide Icons CDN for production.
- **No Figma** file was provided. No GitHub codebase was provided.
- All component styling uses CSS custom properties — link `styles.css` in any consuming page.
