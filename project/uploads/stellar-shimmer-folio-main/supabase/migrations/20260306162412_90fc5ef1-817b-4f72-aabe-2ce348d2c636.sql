
DROP POLICY IF EXISTS "Anyone can view social links" ON public.social_links;
CREATE POLICY "Anyone can view social links" ON public.social_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view about" ON public.about_content;
CREATE POLICY "Anyone can view about" ON public.about_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view experiences" ON public.experiences;
CREATE POLICY "Anyone can view experiences" ON public.experiences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert social links" ON public.social_links;
CREATE POLICY "Authenticated users can insert social links" ON public.social_links FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update social links" ON public.social_links;
CREATE POLICY "Authenticated users can update social links" ON public.social_links FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert about" ON public.about_content;
CREATE POLICY "Authenticated users can insert about" ON public.about_content FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update about" ON public.about_content;
CREATE POLICY "Authenticated users can update about" ON public.about_content FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert experiences" ON public.experiences;
CREATE POLICY "Authenticated users can insert experiences" ON public.experiences FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update experiences" ON public.experiences;
CREATE POLICY "Authenticated users can update experiences" ON public.experiences FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete experiences" ON public.experiences;
CREATE POLICY "Authenticated users can delete experiences" ON public.experiences FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
CREATE POLICY "Authenticated users can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
CREATE POLICY "Authenticated users can delete projects" ON public.projects FOR DELETE TO authenticated USING (true);
