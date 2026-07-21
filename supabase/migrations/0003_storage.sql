-- Public storage bucket for submitted photos. Uploads happen server-side via
-- the service-role key after auth + one-per-week checks, so we don't need
-- permissive object-insert policies for end users. Reads are public.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Anyone can read photo objects (bucket is public); no client write policies —
-- writes go through the service role in the submit server action.
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'photos');
