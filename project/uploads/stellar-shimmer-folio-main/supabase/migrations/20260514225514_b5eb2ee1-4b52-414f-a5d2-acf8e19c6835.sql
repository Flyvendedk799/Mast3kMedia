ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live';
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);