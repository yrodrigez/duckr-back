drop policy "Allow members to read" on "public"."chat_room_members";

drop policy "Allow owner select" on "public"."chat_room_members";

drop policy "Allow chat room members to read" on "public"."chat_rooms";

drop policy "Allow users to read only when they owners" on "public"."chat_rooms";

alter table "public"."chat_room_members" alter column "id" set not null;

CREATE UNIQUE INDEX chat_room_members_pkey ON public.chat_room_members USING btree (id);

CREATE INDEX chat_room_members_user_id_room_id_idx ON public.chat_room_members USING btree (user_id, room_id);

alter table "public"."chat_room_members" add constraint "chat_room_members_pkey" PRIMARY KEY using index "chat_room_members_pkey";

set check_function_bodies = off;

create or replace view "public"."chat_room_members_view" as  SELECT cr.id AS room_id,
    array_agg(u.id) AS member_ids
   FROM ((chat_rooms cr
     JOIN chat_room_members crm ON ((cr.id = crm.room_id)))
     JOIN users u ON ((crm.user_id = u.id)))
  GROUP BY cr.id, cr.name;


CREATE OR REPLACE FUNCTION public.is_user_alloed_to_see_members(tu_puta_madre_id boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
RETURN EXISTS (
  SELECT 1 FROM CHAT_ROOM_MEMBERS CRM
  INNER JOIN (
      SELECT ROOM_ID 
      FROM CHAT_ROOM_MEMBERS 
      WHERE USER_ID = tu_puta_madre_id
  ) AS USER_ROOM_IDS
  ON CRM.room_id=USER_ROOM_IDS.room_id
  WHERE USER_ROOM_IDS.room_id=CRM.room_id
);
END;$function$
;

CREATE OR REPLACE FUNCTION public.is_user_allowed_to_see_members(tu_puta_madre_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
RETURN EXISTS (
  SELECT 1 FROM CHAT_ROOM_MEMBERS CRM
  INNER JOIN (
      SELECT ROOM_ID 
      FROM CHAT_ROOM_MEMBERS 
      WHERE USER_ID = tu_puta_madre_id
  ) AS USER_ROOM_IDS
  ON CRM.room_id=USER_ROOM_IDS.room_id
  WHERE USER_ROOM_IDS.room_id=CRM.room_id
);
END;$function$
;

create policy "Allow users to read messages from chats they belong"
on "public"."chat_messages"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id = chat_messages.room_id) AND (chat_room_members_view.member_ids @> ARRAY[auth.uid()])))));


create policy "chat_room_members_view"
on "public"."chat_room_members"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id = chat_room_members.room_id) AND (chat_room_members_view.member_ids @> ARRAY[auth.uid()])))));


create policy "user_see_own_rooms"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM chat_room_members
  WHERE (chat_room_members.room_id = chat_rooms.id))));



