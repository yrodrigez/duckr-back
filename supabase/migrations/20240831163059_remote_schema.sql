CREATE TRIGGER on_new_user_registered AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION map_private_user_to_public();


alter table "storage"."objects" add column "user_metadata" jsonb;

alter table "storage"."s3_multipart_uploads" add column "user_metadata" jsonb;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
_filename text;
BEGIN
    select string_to_array(name, '/') into _parts;
    select _parts[array_length(_parts,1)] into _filename;
    -- @todo return the last part instead of 2
    return split_part(_filename, '.', 2);
END
$function$
;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
    select string_to_array(name, '/') into _parts;
    return _parts[array_length(_parts,1)];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts,1)-1];
END
$function$
;

create policy "Give loged users access to own folder ksysn5_0"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'users-profile-images'::text));


create policy "Give loged users access to own folder ksysn5_1"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((bucket_id = 'users-profile-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


create policy "Give loged users access to own folder ksysn5_2"
on "storage"."objects"
as permissive
for update
to authenticated
using (((bucket_id = 'users-profile-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


create policy "Give loged users access to own folder ksysn5_3"
on "storage"."objects"
as permissive
for delete
to authenticated
using (((bucket_id = 'users-profile-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



