## Scope

Four expansions, all matching the existing glass + gradient aesthetic, no framer-motion.

### 1. Project detail page — remaining features
New components rendered on `/projects/:slug`:
- **TeamCredits** — avatars + roles (designer, dev, PM, client lead).
- **AwardsRecognition** — badges for awards / featured-in logos.
- **DownloadableAssets** — buttons for case study PDF, brand guidelines, pitch deck (URLs).
- **ShareBar + ReadingTime** — sticky share (copy link, LinkedIn, Twitter) and estimated read time near the title.

DB: add `team`, `awards`, `downloads` (jsonb) to `projects`. Extend `AdminProjects.tsx` with dynamic field arrays for each.

### 2. Home page — more sections
New sections inserted into `Index.tsx`:
- **Stats band** — 4 KPI tiles (products shipped, MRR generated, avg NPS, time-to-MVP).
- **Process** — 5-step "How we work" timeline (Discover → Define → Design → Build → Launch).
- **Industries** — grid of verticals we serve (SaaS, Fintech, Health, E-com, AI).
- **FAQ** — 6 common pre-sales questions in an accordion.

All static content (no admin needed for v1).

### 3. Services — detail pages per tier
- Route: `/services/:slug` (sprint, product, embed).
- Each page: hero, what's included, deliverables checklist, ideal-for, sample work (pulled from projects), FAQ, booking CTA.
- Update `Services.tsx` cards to link to detail pages.

Static content for tier copy; sample work queries existing projects table by category/tag.

### 4. Blog / Insights
- New table `blog_posts` (title, slug, excerpt, content markdown, cover_url, tags, published, published_at).
- Routes: `/insights` (list) and `/insights/:slug` (detail with markdown rendering, reading time, share bar).
- Admin: new `AdminBlog.tsx` with list + editor (markdown textarea, cover upload via existing storage bucket).
- Navbar: add "Insights" link.

## Technical notes

- Migration adds: `projects.team jsonb`, `projects.awards jsonb`, `projects.downloads jsonb`; creates `blog_posts` table with public-read RLS + authenticated CRUD + GRANTs.
- Markdown: use `react-markdown` + `remark-gfm` (already common, will install).
- Share: native `navigator.share` fallback to copy-link + intent URLs.
- Reading time: `Math.ceil(wordCount / 200)`.
- All new components themed via existing `index.css` tokens.

## Files

**Create:** `src/components/TeamCredits.tsx`, `AwardsRecognition.tsx`, `DownloadableAssets.tsx`, `ShareBar.tsx`, `Stats.tsx`, `Process.tsx`, `Industries.tsx`, `FAQ.tsx`, `src/pages/ServiceDetail.tsx`, `src/pages/Insights.tsx`, `src/pages/InsightDetail.tsx`, `src/pages/admin/AdminBlog.tsx`, `src/lib/readingTime.ts`.

**Edit:** `src/pages/ProjectDetail.tsx`, `src/pages/Index.tsx`, `src/components/Services.tsx`, `src/components/Navbar.tsx`, `src/App.tsx` (routes), `src/pages/admin/AdminProjects.tsx`, `src/pages/admin/AdminDashboard.tsx` (blog nav).
