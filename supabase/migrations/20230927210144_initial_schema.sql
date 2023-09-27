drop policy "chat_room_members_view" on "public"."chat_room_members";

drop policy "user_see_own_rooms" on "public"."chat_rooms";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_accessible_rooms(user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT cr.id
  FROM chat_rooms cr
  WHERE cr.owner_id = user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_owner_of_room(user_id uuid, room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM chat_rooms cr
    WHERE cr.id = room_id AND cr.owner_id = user_id
  );
$function$
;

create policy "Allow users to insert messages "
on "public"."chat_messages"
as permissive
for insert
to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id = chat_messages.room_id) AND (chat_room_members_view.member_ids @> ARRAY[auth.uid()]))))));


create policy "Owner can add members to its room"
on "public"."chat_room_members"
as permissive
for insert
to authenticated
with check (is_user_owner_of_room(auth.uid(), room_id));


create policy "Authenticated can create a new chat room"
on "public"."chat_rooms"
as permissive
for insert
to authenticated
with check ((owner_id = auth.uid()));


create policy "chat_room_members_view"
on "public"."chat_room_members"
as permissive
for select
to authenticated
using (((EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id = chat_room_members.room_id) AND (chat_room_members_view.member_ids @> ARRAY[auth.uid()])))) OR is_user_owner_of_room(auth.uid(), room_id)));


create policy "user_see_own_rooms"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM chat_room_members
  WHERE (chat_room_members.room_id = chat_rooms.id)))));



