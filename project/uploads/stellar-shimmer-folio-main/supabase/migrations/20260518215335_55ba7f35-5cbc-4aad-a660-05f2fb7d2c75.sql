ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS before_after jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS press_links jsonb NOT NULL DEFAULT '[]'::jsonb;