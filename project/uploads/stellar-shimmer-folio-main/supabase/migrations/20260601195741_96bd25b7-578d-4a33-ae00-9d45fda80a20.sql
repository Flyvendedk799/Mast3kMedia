ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS team jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS awards jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS downloads jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_url text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  author text NOT NULL DEFAULT 'Mast3kMedia',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated can view all blog posts"
  ON public.blog_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert blog posts"
  ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update blog posts"
  ON public.blog_posts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete blog posts"
  ON public.blog_posts FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);