drop policy "Allow insert where im a member" on "public"."chat_messages";

drop policy "Allow to read messages where I am a room member" on "public"."chat_messages";

drop policy "Allow add members to chat room if owner or already in it" on "public"."chat_room_members";

drop policy "Allow only owners to remove" on "public"."chat_room_members";

drop policy "Allow owner and members to select" on "public"."chat_room_members";

drop policy "Allow auth users to create" on "public"."chat_rooms";

drop policy "Allow chat room members to update" on "public"."chat_rooms";

drop policy "Allow users to read only when they have access or owners" on "public"."chat_rooms";

create policy "Allow members to read"
on "public"."chat_room_members"
as permissive
for select
to authenticated
using ((user_id IN ( SELECT chat_room_members_1.user_id
   FROM chat_room_members chat_room_members_1
  WHERE (chat_room_members_1.room_id IN ( SELECT cm.room_id
           FROM chat_room_members cm
          WHERE (cm.user_id = auth.uid()))))));


create policy "Allow owner select"
on "public"."chat_room_members"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Allow chat room members to read"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using ((id IN ( SELECT rm.room_id
   FROM chat_room_members rm
  WHERE (rm.user_id = auth.uid()))));


create policy "Allow users to read only when they owners"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using ((auth.uid() = owner_id));



