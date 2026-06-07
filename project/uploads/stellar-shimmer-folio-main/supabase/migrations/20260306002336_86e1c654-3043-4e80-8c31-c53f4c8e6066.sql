
-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true);

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'project-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-images');

-- Allow authenticated users to update
CREATE POLICY "Authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-images');
