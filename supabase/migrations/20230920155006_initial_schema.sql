create policy "Allow chat room members to update"
on "public"."chat_room"
as permissive
for update
to authenticated
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_member
  WHERE ((chat_room_member.room_id = chat_room_member.room_id) AND (chat_room_member.user_id = auth.uid()))))))
with check (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_member
  WHERE ((chat_room_member.room_id = chat_room_member.room_id) AND (chat_room_member.user_id = auth.uid()))))));


create policy "Allow users to read only when they have access or owners"
on "public"."chat_room"
as permissive
for select
to authenticated
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_member
  WHERE ((chat_room_member.room_id = chat_room_member.room_id) AND (chat_room_member.user_id = auth.uid()))))));


create policy "Allow add members to chat room if owner or already in it"
on "public"."chat_room_member"
as permissive
for insert
to authenticated
with check (((EXISTS ( SELECT 1
   FROM chat_room
  WHERE ((chat_room.id = chat_room_member.room_id) AND (chat_room.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM chat_room_member chat_room_member_1
  WHERE ((chat_room_member_1.room_id = chat_room_member_1.room_id) AND (chat_room_member_1.user_id = auth.uid()))))));


create policy "Allow only owners to remove"
on "public"."chat_room_member"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM chat_room
  WHERE ((chat_room.id = chat_room_member.room_id) AND (chat_room.owner_id = auth.uid())))));


create policy "Allow owner and members to select"
on "public"."chat_room_member"
as permissive
for select
to authenticated
using (((EXISTS ( SELECT 1
   FROM chat_room
  WHERE ((chat_room.id = chat_room_member.room_id) AND (chat_room.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM chat_room_member chat_room_member_1
  WHERE ((chat_room_member_1.room_id = chat_room_member_1.room_id) AND (chat_room_member_1.user_id = auth.uid()))))));



