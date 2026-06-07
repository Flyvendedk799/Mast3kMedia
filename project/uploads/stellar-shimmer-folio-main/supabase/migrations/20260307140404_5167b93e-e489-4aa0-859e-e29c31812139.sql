ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_urls text[] NOT NULL DEFAULT '{}';