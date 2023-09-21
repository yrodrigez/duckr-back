drop policy "Allow insert where im a member" on "public"."chat_message";

drop policy "Allow to read messages where I am a room member" on "public"."chat_message";

drop policy "Allow auth users to create" on "public"."chat_room";

drop policy "Allow chat room members to update" on "public"."chat_room";

drop policy "Allow users to read only when they have access or owners" on "public"."chat_room";

drop policy "Allow add members to chat room if owner or already in it" on "public"."chat_room_member";

drop policy "Allow only owners to remove" on "public"."chat_room_member";

drop policy "Allow owner and members to select" on "public"."chat_room_member";

alter table "public"."chat_message" drop constraint "chat_message_room_id_fkey";

alter table "public"."chat_message" drop constraint "chat_message_user_id_fkey";

alter table "public"."chat_room" drop constraint "chat_room_owner_id_fkey";

alter table "public"."chat_room_member" drop constraint "chat_room_member_room_id_fkey";

alter table "public"."chat_room_member" drop constraint "chat_room_member_user_id_fkey";

alter table "public"."chat_message" drop constraint "chat-message_pkey";

alter table "public"."chat_room" drop constraint "chat-room_pkey";

alter table "public"."chat_room_member" drop constraint "chat-room-member_pkey";

drop index if exists "public"."chat-room-member_pkey";

drop index if exists "public"."chat-message_pkey";

drop index if exists "public"."chat-room_pkey";

drop table "public"."chat_message";

drop table "public"."chat_room";

drop table "public"."chat_room_member";

create table "public"."chat_messages" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "message" text not null,
    "user_id" uuid not null,
    "room_id" uuid not null
);


alter table "public"."chat_messages" enable row level security;

create table "public"."chat_room_members" (
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "room_id" uuid not null,
    "id" uuid default gen_random_uuid()
);


alter table "public"."chat_room_members" enable row level security;

create table "public"."chat_rooms" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "owner_id" uuid
);


alter table "public"."chat_rooms" enable row level security;

CREATE UNIQUE INDEX "chat-message_pkey" ON public.chat_messages USING btree (id);

CREATE UNIQUE INDEX "chat-room_pkey" ON public.chat_rooms USING btree (id);

alter table "public"."chat_messages" add constraint "chat-message_pkey" PRIMARY KEY using index "chat-message_pkey";

alter table "public"."chat_rooms" add constraint "chat-room_pkey" PRIMARY KEY using index "chat-room_pkey";

alter table "public"."chat_messages" add constraint "chat_messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_room_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_user_id_fkey";

alter table "public"."chat_room_members" add constraint "chat_room_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."chat_room_members" validate constraint "chat_room_members_room_id_fkey";

alter table "public"."chat_room_members" add constraint "chat_room_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."chat_room_members" validate constraint "chat_room_members_user_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_owner_id_fkey";

create policy "Allow insert where im a member"
on "public"."chat_messages"
as permissive
for insert
to authenticated
with check ((room_id IN ( SELECT chat_room_members.room_id
   FROM chat_room_members
  WHERE (chat_room_members.user_id = auth.uid()))));


create policy "Allow to read messages where I am a room member"
on "public"."chat_messages"
as permissive
for select
to authenticated
using ((room_id IN ( SELECT chat_room_members.room_id
   FROM chat_room_members
  WHERE (chat_room_members.user_id = auth.uid()))));


create policy "Allow add members to chat room if owner or already in it"
on "public"."chat_room_members"
as permissive
for insert
to authenticated
with check (((EXISTS ( SELECT 1
   FROM chat_rooms
  WHERE ((chat_rooms.id = chat_room_members.room_id) AND (chat_rooms.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM chat_room_members chat_room_members_1
  WHERE ((chat_room_members_1.room_id = chat_room_members_1.room_id) AND (chat_room_members_1.user_id = auth.uid()))))));


create policy "Allow only owners to remove"
on "public"."chat_room_members"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM chat_rooms
  WHERE ((chat_rooms.id = chat_room_members.room_id) AND (chat_rooms.owner_id = auth.uid())))));


create policy "Allow owner and members to select"
on "public"."chat_room_members"
as permissive
for select
to authenticated
using (((EXISTS ( SELECT 1
   FROM chat_rooms
  WHERE ((chat_rooms.id = chat_room_members.room_id) AND (chat_rooms.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM chat_room_members chat_room_members_1
  WHERE ((chat_room_members_1.room_id = chat_room_members_1.room_id) AND (chat_room_members_1.user_id = auth.uid()))))));


create policy "Allow auth users to create"
on "public"."chat_rooms"
as permissive
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));


create policy "Allow chat room members to update"
on "public"."chat_rooms"
as permissive
for update
to authenticated
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_members
  WHERE ((chat_room_members.room_id = chat_room_members.room_id) AND (chat_room_members.user_id = auth.uid()))))))
with check (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_members
  WHERE ((chat_room_members.room_id = chat_room_members.room_id) AND (chat_room_members.user_id = auth.uid()))))));


create policy "Allow users to read only when they have access or owners"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM chat_room_members
  WHERE ((chat_room_members.user_id = auth.uid()) AND (chat_room_members.id = chat_room_members.room_id))))));



