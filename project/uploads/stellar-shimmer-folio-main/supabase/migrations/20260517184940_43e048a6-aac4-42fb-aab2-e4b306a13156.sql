ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tech_rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS process_gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_project_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];