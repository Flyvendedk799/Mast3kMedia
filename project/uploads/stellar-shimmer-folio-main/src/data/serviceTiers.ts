import { Sparkles, Layers, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ServiceTier {
  slug: 'sprint' | 'product' | 'embed';
  name: string;
  tagline: string;
  price: string;
  cadence: string;
  icon: LucideIcon;
  featured?: boolean;
  features: string[];
  cta: string;
  // Detail page only:
  hero: string;
  idealFor: string[];
  includes: { title: string; desc: string }[];
  faq: { q: string; a: string }[];
}

export const tiers: ServiceTier[] = [
  {
    slug: 'sprint',
    name: 'Sprint',
    tagline: 'A focused two-week burst for a single surface.',
    price: '€6,500',
    cadence: 'fixed · 2 weeks',
    icon: Sparkles,
    features: [
      'Landing page or marketing site',
      'Brand-aligned design system',
      'Motion + interaction polish',
      'Deployed to production',
    ],
    cta: 'Start a sprint',
    hero: 'A fixed two-week engagement to ship one beautiful, conversion-ready surface — without endless rounds.',
    idealFor: [
      'Startups launching v1 of a marketing site',
      'Series A teams refreshing a tired landing page',
      'Solo founders who need design and engineering in one team',
    ],
    includes: [
      { title: 'Kickoff & strategy', desc: 'A 60-min session to align on audience, message, and success metrics.' },
      { title: 'Design system', desc: 'Tokens, type, components — extracted from your brand or built from scratch.' },
      { title: 'Production build', desc: 'Hand-coded React + Tailwind, hosted on Vercel or Netlify.' },
      { title: 'Motion polish', desc: 'Hover, scroll, and entrance animations tuned for an Awwwards feel.' },
      { title: 'Analytics setup', desc: 'GA4 + Plausible wired up to conversion events out of the box.' },
      { title: '14 days of fixes', desc: 'Post-launch tweaks included — bugs, copy, small polish.' },
    ],
    faq: [
      { q: 'Can it cover more than one page?', a: 'Yes — a sprint typically covers 3–6 pages including home, pricing, about, and a templated blog.' },
      { q: 'What if scope grows mid-sprint?', a: 'We park it in a v2 backlog. The sprint always ships on time at fixed scope.' },
    ],
  },
  {
    slug: 'product',
    name: 'Product',
    tagline: 'End-to-end product engineering for serious teams.',
    price: '€18,000',
    cadence: 'per month · 3 month min',
    icon: Layers,
    featured: true,
    features: [
      'Full product design & engineering',
      'Backend, APIs, integrations',
      'Weekly shipping cadence',
      'Direct Slack / Linear access',
      'Senior team — no juniors',
    ],
    cta: 'Book a kickoff',
    hero: 'A senior product team — designer, full-stack engineer, PM — embedded on your roadmap and shipping every week.',
    idealFor: [
      'Pre-seed to Series B teams without an in-house product team',
      'Founders shipping a complex SaaS, marketplace, or AI product',
      'Teams that need design + frontend + backend in one engagement',
    ],
    includes: [
      { title: 'Senior pod', desc: 'Lead designer, full-stack engineer, and PM — all senior, all dedicated.' },
      { title: 'Weekly demos', desc: 'Every Friday we ship to staging and walk you through what shipped.' },
      { title: 'Backend & infra', desc: 'Auth, payments, queues, observability — built right the first time.' },
      { title: 'Integrations', desc: 'Stripe, Linear, OpenAI, Supabase, and your own APIs.' },
      { title: 'Linear & Slack', desc: 'Shared backlog you control. Async by default, calls when they matter.' },
      { title: 'Hand-off included', desc: 'Documentation and pairing sessions to transition to your team.' },
    ],
    faq: [
      { q: 'Can we pause the retainer?', a: 'After month 3, yes — with 30 days notice. We never lock you in.' },
      { q: 'Who owns the IP?', a: 'You do. The code lives in your GitHub from day one.' },
    ],
  },
  {
    slug: 'embed',
    name: 'Embed',
    tagline: 'Drop-in studio team for in-flight roadmaps.',
    price: 'Custom',
    cadence: 'quarterly retainer',
    icon: Rocket,
    features: [
      'Fractional design + engineering',
      'Roadmap & technical strategy',
      'Codebase audits + refactors',
      'Hiring & process support',
    ],
    cta: 'Scope an engagement',
    hero: 'Fractional senior talent that slots into your existing team — for strategy, audits, and roadmap execution.',
    idealFor: [
      'Series B+ teams scaling product velocity',
      'CTOs needing a senior design / frontend partner',
      'Companies preparing for a major launch or pivot',
    ],
    includes: [
      { title: 'Embedded talent', desc: 'Fractional designers, engineers, and PMs on your Slack and Linear.' },
      { title: 'Codebase audits', desc: 'Quarterly technical reviews with prioritized refactor recommendations.' },
      { title: 'Hiring support', desc: 'We help you scope roles, screen candidates, and onboard new hires.' },
      { title: 'Strategy', desc: 'Quarterly roadmap planning and architectural decision support.' },
      { title: 'On-call polish', desc: 'A small reserved capacity each week for the hard problems.' },
      { title: 'Custom SLA', desc: 'Engagement terms shaped to your governance and procurement needs.' },
    ],
    faq: [
      { q: 'How is this different from Product?', a: 'Embed augments your existing team. Product runs an end-to-end build for you.' },
      { q: 'What is the minimum commitment?', a: 'One quarter (3 months). Most clients stay 12+ months.' },
    ],
  },
];

export const getTier = (slug?: string) => tiers.find((t) => t.slug === slug);
