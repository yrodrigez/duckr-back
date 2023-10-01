create table "public"."chat_message_read" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "received_at" timestamp with time zone not null default now(),
    "read_at" timestamp with time zone,
    "room_id" uuid
);


alter table "public"."chat_message_read" enable row level security;

CREATE UNIQUE INDEX chat_message_read_pkey ON public.chat_message_read USING btree (id);

alter table "public"."chat_message_read" add constraint "chat_message_read_pkey" PRIMARY KEY using index "chat_message_read_pkey";

alter table "public"."chat_message_read" add constraint "chat_message_read_message_id_fkey" FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_message_read" validate constraint "chat_message_read_message_id_fkey";

alter table "public"."chat_message_read" add constraint "chat_message_read_room_id_fkey" FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."chat_message_read" validate constraint "chat_message_read_room_id_fkey";

alter table "public"."chat_message_read" add constraint "chat_message_read_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."chat_message_read" validate constraint "chat_message_read_user_id_fkey";

create policy "Allow members to insert"
on "public"."chat_message_read"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id IN ( SELECT chat_messages.room_id
           FROM chat_messages
          WHERE (chat_messages.id = chat_message_read.message_id))) AND (auth.uid() = ANY (chat_room_members_view.member_ids))))));


create policy "Allow members to read"
on "public"."chat_message_read"
as permissive
for select
to authenticated
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM chat_room_members_view
  WHERE ((chat_room_members_view.room_id IN ( SELECT chat_messages.room_id
           FROM chat_messages
          WHERE (chat_messages.id = chat_message_read.message_id))) AND (auth.uid() = ANY (chat_room_members_view.member_ids)))))));


create policy "Only the owner can update"
on "public"."chat_message_read"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



