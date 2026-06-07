ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_single_pinned ON public.projects(pinned) WHERE pinned = true;