

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "open_campaign";


ALTER SCHEMA "open_campaign" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_total_reservations"("reset_uuid" "uuid", "char_id" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_reservations INT;
BEGIN
    SELECT 
        COALESCE(SUM(er.extra_reservations), 0) + COALESCE(MAX(r.reservation_amount), 0) AS total_reservations
    INTO total_reservations
    FROM 
        raid_resets re
    JOIN 
        ev_raid r ON re.raid_id = r.id
    LEFT JOIN 
        ev_extra_reservations er ON er.reset_id = re.id AND er.character_id = char_id
    WHERE 
        re.id = reset_uuid;

    RETURN total_reservations;
END;
$$;


ALTER FUNCTION "public"."calculate_total_reservations"("reset_uuid" "uuid", "char_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    reservation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO reservation_count
    FROM raid_loot_reservation
    WHERE member_id = member_id_arg AND reset_id = reset_id_arg;

    RETURN reservation_count;
END;
$$;


ALTER FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    reservation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO reservation_count
    FROM raid_loot_reservation
    WHERE member_id = member_id_arg AND reset_id = reset_id_arg;

    RETURN reservation_count;
END;
$$;


ALTER FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_molten_core_raid"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    molten_core_raid_id UUID := '54585ad0-f02f-4a3c-8789-451f691a1824'::uuid;  -- Molten Core raid_id
    last_raid RECORD;
BEGIN
    -- Initialize last_raid with null values
    last_raid := NULL;

    -- Find the last record created for the specified raid_id
    FOR last_raid IN
        SELECT *
        FROM raid_resets
        WHERE raid_id = molten_core_raid_id
        ORDER BY raid_date DESC
        LIMIT 1
    LOOP
        -- Debugging output inside the loop
        RAISE NOTICE 'Found last raid with raid_date: %', last_raid.raid_date;
    END LOOP;

    -- Check if a record was found
    IF last_raid IS NOT NULL THEN
        -- Create a new record with raid_date incremented by 7 days
        INSERT INTO raid_resets (raid_date, raid_id) 
        VALUES (last_raid.raid_date + INTERVAL '7 days', molten_core_raid_id);
        
        -- Debugging output
        RAISE NOTICE 'Inserted new raid with raid_date: %', last_raid.raid_date + INTERVAL '7 days';
    ELSE
        RAISE NOTICE 'No raid found for raid_id: %', molten_core_raid_id;
    END IF;
END;$$;


ALTER FUNCTION "public"."duplicate_molten_core_raid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_raid"("p_interval" interval, "p_raid_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    last_raid_date DATE;
BEGIN
    -- Get the last raid_date for the specified raid_id
    last_raid_date := get_last_raid_date(p_raid_id);

    -- Check if a date was found
    IF last_raid_date IS NOT NULL THEN
        -- Debugging output
        RAISE NOTICE 'Found last raid with raid_date: %', last_raid_date;
        
        -- Create a new record with raid_date incremented by the given interval
        INSERT INTO raid_resets (raid_date, raid_id)
        VALUES (last_raid_date + p_interval, p_raid_id);
        
        -- Debugging output
        RAISE NOTICE 'Inserted new raid with raid_date: %', last_raid_date + p_interval;
    ELSE
        RAISE NOTICE 'No raid found for raid_id: %', p_raid_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."duplicate_raid"("p_interval" interval, "p_raid_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_rooms"("user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT cr.id
  FROM chat_rooms cr
  WHERE cr.owner_id = user_id;
$$;


ALTER FUNCTION "public"."get_accessible_rooms"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_roster_history"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    response jsonb;
BEGIN
    SELECT net.http_get(
        url => 'https://ijzwizzfjawlixolcuia.supabase.co/functions/v1/cron_ev_guild_roster_history',
        headers => '{
            "Content-Type": "application/json", 
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqendpenpmamF3bGl4b2xjdWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM3NTYwMzksImV4cCI6MjAwOTMzMjAzOX0.rEG17d9lwDqB3vQq2RXM78Z-qGjYIZ4RBJZi9uwXPvI"
        }'
    ) INTO response;
    RETURN response;
END;
$$;


ALTER FUNCTION "public"."get_guild_roster_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_raid_date"("p_raid_id" "uuid") RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    last_raid_date DATE;
BEGIN
    -- Find the last raid_date for the specified raid_id
    SELECT raid_date
    INTO last_raid_date
    FROM raid_resets
    WHERE raid_id = p_raid_id
    ORDER BY raid_date DESC
    LIMIT 1;

    -- Return the last raid_date
    RETURN last_raid_date;
END;
$$;


ALTER FUNCTION "public"."get_last_raid_date"("p_raid_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_ev_member_to_private"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  INSERT INTO auth.users (id, role, aud, raw_user_meta_data, created_at, updated_at)
  SELECT
    NEW.user_id AS id,
    'authenticated' AS role,
    'authenticated' AS aud,
    NEW.character AS raw_user_meta_data,
    now() as created_at,
    now() as updated_at
  WHERE
    NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.user_id
    );
  
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."insert_ev_member_to_private"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_alloed_to_see_members"("tu_puta_madre_id" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
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
END;$$;


ALTER FUNCTION "public"."is_user_alloed_to_see_members"("tu_puta_madre_id" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_allowed_to_see_members"("tu_puta_madre_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
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
END;$$;


ALTER FUNCTION "public"."is_user_allowed_to_see_members"("tu_puta_madre_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_owner_of_room"("user_id" "uuid", "room_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_rooms cr
    WHERE cr.id = room_id AND cr.owner_id = user_id
  );
$$;


ALTER FUNCTION "public"."is_user_owner_of_room"("user_id" "uuid", "room_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."map_private_user_to_public"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  INSERT INTO public.users(id, name, user_name, avatar_url)
  values (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  return NEW;
END$$;


ALTER FUNCTION "public"."map_private_user_to_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."map_public_username_to_private"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  NEW.user_name := LOWER(SUBSTRING(NEW.user_name, 1, 1)) || SUBSTRING(NEW.user_name, 2);

  UPDATE auth.users
  SET raw_user_meta_data = '{}'::jsonb
  WHERE id = NEW.id AND raw_user_meta_data IS NULL;

  DECLARE 
    existing_user_name text;
  BEGIN
    SELECT raw_user_meta_data->>'user_name' INTO existing_user_name
    FROM auth.users
    WHERE id = NEW.id;
    
    IF existing_user_name = NEW.user_name THEN 
      RETURN NEW;
    END IF;

    IF existing_user_name IS NOT NULL AND existing_user_name != '' THEN
      RAISE EXCEPTION 'user_name already exists';
    END IF;

    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{user_name}',
      ('"' || NEW.user_name || '"')::jsonb
    )
    WHERE id = NEW.id;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."map_public_username_to_private"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_weekly_raids"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    -- Molten Core every 7 days (weekly on the same day)
    PERFORM duplicate_raid('7 days'::INTERVAL, '54585ad0-f02f-4a3c-8789-451f691a1824'::UUID); 

    -- Onyxia every 7 days
    -- Duplicate Onyxia for Sunday
    --PERFORM duplicate_raid('7 days'::INTERVAL, '051bba08-dd74-4896-8768-68d7199cd364'::UUID); 
END;$$;


ALTER FUNCTION "public"."run_weekly_raids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_select_last_raid"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    molten_core_raid_id UUID := '54585ad0-f02f-4a3c-8789-451f691a1824'::uuid;  -- Molten Core raid_id
    last_raid RECORD;
BEGIN
    -- Initialize last_raid with null values
    last_raid := NULL;

    -- Find the last record created for the specified raid_id
    FOR last_raid IN
        SELECT *
        FROM raid_resets
        WHERE raid_id = molten_core_raid_id
        ORDER BY raid_date DESC
        LIMIT 1
    LOOP
        -- Debugging output inside the loop
        RAISE NOTICE 'Found last raid with raid_date: %', last_raid.raid_date;
    END LOOP;

    -- Check if a record was found
    IF last_raid IS NULL THEN
        RAISE NOTICE 'No raid found for raid_id: %', molten_core_raid_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."test_select_last_raid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_enddate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    IF NEW.end_date IS NULL THEN
        NEW.end_date := CAST((NEW.raid_date + NEW.max_delay_days * INTERVAL '1 day') AS DATE);
    END IF;
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_enddate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_raid_reset_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the name in raid_resets using the name from ev_raid
    UPDATE raid_resets
    SET name = ev_raid.name
    FROM ev_raid
    WHERE raid_resets.raid_id = ev_raid.id
      AND raid_resets.id = NEW.id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_raid_reset_name"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "open_campaign"."broadlog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel" "text",
    "html" "text",
    "text" "text",
    "bcc" "text",
    "last_event" "text",
    "to" "text"
);


ALTER TABLE "open_campaign"."broadlog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blizzard_token" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."blizzard_token" OWNER TO "postgres";


ALTER TABLE "public"."blizzard_token" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."blizzard_token_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chat_message_read" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "room_id" "uuid"
);


ALTER TABLE "public"."chat_message_read" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room_members" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."chat_room_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "owner_id" "uuid"
);


ALTER TABLE "public"."chat_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "user_name" "text",
    "avatar_url" "text",
    "created_at" "date" DEFAULT "now"(),
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."chat_room_members_view" AS
 SELECT "cr"."id" AS "room_id",
    "array_agg"("u"."id") AS "member_ids"
   FROM (("public"."chat_rooms" "cr"
     JOIN "public"."chat_room_members" "crm" ON (("cr"."id" = "crm"."room_id")))
     JOIN "public"."users" "u" ON (("crm"."user_id" = "u"."id")))
  GROUP BY "cr"."id", "cr"."name";


ALTER TABLE "public"."chat_room_members_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_admin" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ev_admin" OWNER TO "postgres";


ALTER TABLE "public"."ev_admin" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ev_admin_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ev_application" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "message" "text",
    "email" "text",
    "class" "text" NOT NULL,
    "role" "text" NOT NULL
);


ALTER TABLE "public"."ev_application" OWNER TO "postgres";


ALTER TABLE "public"."ev_application" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ev_application_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ev_extra_reservations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reset_id" "uuid" NOT NULL,
    "character_id" bigint NOT NULL,
    "extra_reservations" bigint DEFAULT '0'::bigint NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "given_by" bigint
);


ALTER TABLE "public"."ev_extra_reservations" OWNER TO "postgres";


ALTER TABLE "public"."ev_extra_reservations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ev_extra_reservation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ev_guild_roster_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb" NOT NULL
);


ALTER TABLE "public"."ev_guild_roster_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_loot_history" (
    "id" "text" NOT NULL,
    "dateTime" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raid_id" "uuid" NOT NULL,
    "itemID" bigint,
    "character" "text",
    "offspec" smallint
);


ALTER TABLE "public"."ev_loot_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_member" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "character" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_source" "text" DEFAULT 'bnet_oauth'::"text"
);


ALTER TABLE "public"."ev_member" OWNER TO "postgres";


ALTER TABLE "public"."ev_member" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ev_member_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ev_member_role" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" bigint NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ev_member_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_raid" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT 'Sunken Temple'::"text" NOT NULL,
    "min_level" bigint DEFAULT '50'::bigint,
    "image" "text" DEFAULT ''::"text",
    "reservation_amount" bigint DEFAULT '1'::bigint NOT NULL
);


ALTER TABLE "public"."ev_raid" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_raid_participant" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" bigint NOT NULL,
    "raid_id" "uuid" NOT NULL,
    "is_confirmed" boolean NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."ev_raid_participant" OWNER TO "postgres";


ALTER TABLE "public"."ev_raid_participant" ALTER COLUMN "member_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ev_raid_participant_member_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ev_role" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."ev_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_role_permissions" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."ev_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "follower_id" "uuid" NOT NULL
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


COMMENT ON TABLE "public"."follows" IS 'Follows';



CREATE TABLE IF NOT EXISTS "public"."last_raid" (
    "created_at" timestamp with time zone,
    "raid_date" "date",
    "id" "uuid",
    "modified_at" timestamp with time zone,
    "name" "text",
    "time" time without time zone,
    "max_delay_days" integer,
    "status" "text",
    "image_url" "text",
    "min_lvl" bigint,
    "end_date" "date",
    "reservations_closed" boolean,
    "raid_id" "uuid"
);


ALTER TABLE "public"."last_raid" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."log_table" (
    "log_time" timestamp with time zone DEFAULT "now"(),
    "message" "text"
);


ALTER TABLE "public"."log_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_rank" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rank_number" bigint,
    "member_id" bigint
);


ALTER TABLE "public"."member_rank" OWNER TO "postgres";


ALTER TABLE "public"."member_rank" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."member_rank_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" character varying NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid"
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."posts" IS 'User posts';



COMMENT ON COLUMN "public"."posts"."post_id" IS 'Reply to post';



CREATE TABLE IF NOT EXISTS "public"."raid_loot" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "item_id" bigint,
    "raid_id" "uuid",
    "is_visible" boolean DEFAULT true
);


ALTER TABLE "public"."raid_loot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raid_loot_item" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "jsonb",
    "raid_id" "uuid"
);


ALTER TABLE "public"."raid_loot_item" OWNER TO "postgres";


ALTER TABLE "public"."raid_loot_item" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."raid_loot_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."raid_loot_reservation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" bigint NOT NULL,
    "status" "text" DEFAULT 'reserved'::"text",
    "status_color" "text",
    "item_id" bigint NOT NULL,
    "modified_at" timestamp without time zone DEFAULT "now"(),
    "reset_id" "uuid" NOT NULL
);


ALTER TABLE "public"."raid_loot_reservation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raid_resets" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raid_date" "date" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" DEFAULT 'Sunken Temple'::"text",
    "time" time without time zone DEFAULT '20:30:00'::time without time zone,
    "max_delay_days" integer DEFAULT 6,
    "status" "text",
    "image_url" "text" DEFAULT '/sunken_temple-raid.webp'::"text",
    "min_lvl" bigint DEFAULT '50'::bigint,
    "end_date" "date",
    "reservations_closed" boolean DEFAULT false,
    "raid_id" "uuid" DEFAULT '65c70baf-e3c1-4746-8520-02d2e4c1a813'::"uuid",
    "days" "jsonb" DEFAULT '["wed", "sun"]'::"jsonb" NOT NULL,
    "end_time" time without time zone DEFAULT '00:00:00'::time without time zone
);


ALTER TABLE "public"."raid_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipients" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "avatar" "text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wow_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb" NOT NULL,
    "display_id" bigint
);


ALTER TABLE "public"."wow_items" OWNER TO "postgres";


ALTER TABLE "public"."wow_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wow_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "open_campaign"."broadlog"
    ADD CONSTRAINT "broadlog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blizzard_token"
    ADD CONSTRAINT "blizzard_token_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat-message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat-room_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_message_read"
    ADD CONSTRAINT "chat_message_read_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_room_members"
    ADD CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_admin"
    ADD CONSTRAINT "ev_admin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_application"
    ADD CONSTRAINT "ev_application_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."ev_application"
    ADD CONSTRAINT "ev_application_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ev_application"
    ADD CONSTRAINT "ev_application_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_extra_reservations"
    ADD CONSTRAINT "ev_extra_reservation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_guild_roster_history"
    ADD CONSTRAINT "ev_guild_roster_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_loot_history"
    ADD CONSTRAINT "ev_loot_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_member"
    ADD CONSTRAINT "ev_member_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_member_role"
    ADD CONSTRAINT "ev_member_role_member_id_key" UNIQUE ("member_id");



ALTER TABLE ONLY "public"."ev_member_role"
    ADD CONSTRAINT "ev_member_role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_member"
    ADD CONSTRAINT "ev_member_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ev_raid"
    ADD CONSTRAINT "ev_raid_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ev_raid_participant"
    ADD CONSTRAINT "ev_raid_participant_pkey" PRIMARY KEY ("member_id", "raid_id");



ALTER TABLE ONLY "public"."ev_raid"
    ADD CONSTRAINT "ev_raid_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_role_permissions"
    ADD CONSTRAINT "ev_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_role"
    ADD CONSTRAINT "ev_role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_rank"
    ADD CONSTRAINT "member_rank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_loot_item"
    ADD CONSTRAINT "raid_loot_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_loot"
    ADD CONSTRAINT "raid_loot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_loot_reservation"
    ADD CONSTRAINT "raid_loot_reservation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_resets"
    ADD CONSTRAINT "raid_resets_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."raid_resets"
    ADD CONSTRAINT "raid_resets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_loot"
    ADD CONSTRAINT "unique_item_raid" UNIQUE ("item_id", "raid_id");



ALTER TABLE ONLY "public"."ev_extra_reservations"
    ADD CONSTRAINT "unique_reset_character" UNIQUE ("reset_id", "character_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wow_items"
    ADD CONSTRAINT "wow_item_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."wow_items"
    ADD CONSTRAINT "wow_item_pkey" PRIMARY KEY ("id");



CREATE INDEX "chat_room_members_user_id_room_id_idx" ON "public"."chat_room_members" USING "btree" ("user_id", "room_id");



CREATE UNIQUE INDEX "ev_member_role_role_id_member_id_idx" ON "public"."ev_member_role" USING "btree" ("role_id", "member_id");



CREATE UNIQUE INDEX "ev_role_permissions_role_id_permission_idx" ON "public"."ev_role_permissions" USING "btree" ("role_id", "permission");



CREATE UNIQUE INDEX "follows_user_id_follower_id_idx" ON "public"."follows" USING "btree" ("user_id", "follower_id");



CREATE INDEX "idx_raid_loot_item_raid" ON "public"."raid_loot" USING "btree" ("item_id", "raid_id");



CREATE UNIQUE INDEX "likes_post_id_user_id_idx" ON "public"."likes" USING "btree" ("post_id", "user_id");



CREATE UNIQUE INDEX "users_user_name_idx" ON "public"."users" USING "btree" ("user_name");



CREATE OR REPLACE TRIGGER "after_raid_reset_insert" AFTER INSERT ON "public"."raid_resets" FOR EACH ROW EXECUTE FUNCTION "public"."update_raid_reset_name"();



CREATE OR REPLACE TRIGGER "on_ev_member_created" AFTER INSERT ON "public"."ev_member" FOR EACH ROW EXECUTE FUNCTION "public"."insert_ev_member_to_private"();



CREATE OR REPLACE TRIGGER "on_update_username" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."map_public_username_to_private"();



CREATE OR REPLACE TRIGGER "set_enddate" BEFORE INSERT OR UPDATE ON "public"."raid_resets" FOR EACH ROW EXECUTE FUNCTION "public"."update_enddate"();



ALTER TABLE ONLY "public"."chat_message_read"
    ADD CONSTRAINT "chat_message_read_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message_read"
    ADD CONSTRAINT "chat_message_read_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message_read"
    ADD CONSTRAINT "chat_message_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_members"
    ADD CONSTRAINT "chat_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_members"
    ADD CONSTRAINT "chat_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ev_admin"
    ADD CONSTRAINT "ev_admin_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_extra_reservations"
    ADD CONSTRAINT "ev_extra_reservation_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_extra_reservations"
    ADD CONSTRAINT "ev_extra_reservation_given_by_fkey" FOREIGN KEY ("given_by") REFERENCES "public"."ev_member"("id");



ALTER TABLE ONLY "public"."ev_extra_reservations"
    ADD CONSTRAINT "ev_extra_reservation_reset_id_fkey" FOREIGN KEY ("reset_id") REFERENCES "public"."raid_resets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_loot_history"
    ADD CONSTRAINT "ev_loot_history_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "public"."raid_resets"("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_rank"
    ADD CONSTRAINT "member_rank_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_member_role"
    ADD CONSTRAINT "public_ev_member_role_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_member_role"
    ADD CONSTRAINT "public_ev_member_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ev_role"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_role_permissions"
    ADD CONSTRAINT "public_ev_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."ev_role"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_raid_participant"
    ADD CONSTRAINT "public_member_raid_reset_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_raid_participant"
    ADD CONSTRAINT "public_member_raid_reset_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "public"."raid_resets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot_item"
    ADD CONSTRAINT "public_raid_loot_item_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "public"."ev_raid"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot_reservation"
    ADD CONSTRAINT "public_raid_loot_reservation_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."raid_loot_item"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot_reservation"
    ADD CONSTRAINT "public_raid_loot_reservation_reset_id_fkey" FOREIGN KEY ("reset_id") REFERENCES "public"."raid_resets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot"
    ADD CONSTRAINT "raid_loot_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."raid_loot_item"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot"
    ADD CONSTRAINT "raid_loot_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "public"."ev_raid"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_loot_reservation"
    ADD CONSTRAINT "raid_loot_reservation_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."ev_member"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_resets"
    ADD CONSTRAINT "raid_resets_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "public"."ev_raid"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "open_campaign"."broadlog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admin can do everything" ON "public"."ev_extra_reservations" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))) AND (EXISTS ( SELECT 1
   FROM "public"."raid_resets"
  WHERE ("raid_resets"."id" = "ev_extra_reservations"."reset_id")))));



CREATE POLICY "Admin can do everything" ON "public"."raid_loot" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))));



CREATE POLICY "Admin can do everything" ON "public"."raid_loot_item" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))));



CREATE POLICY "Allow Own Update" ON "public"."ev_member" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() ->> 'cid'::"text"))::integer = "id"));



CREATE POLICY "Allow admin to delete" ON "public"."raid_loot_reservation" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))));



CREATE POLICY "Allow admin to insert on everyone" ON "public"."raid_loot_reservation" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))) AND (EXISTS ( SELECT 1
   FROM "public"."raid_resets"
  WHERE ("raid_resets"."id" = "raid_loot_reservation"."reset_id")))));



CREATE POLICY "Allow all read" ON "public"."ev_member" FOR SELECT USING (true);



CREATE POLICY "Allow all to read public users info" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow all user to read posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Allow delete own" ON "public"."raid_loot_reservation" FOR DELETE TO "authenticated" USING ((("member_id" = (("auth"."jwt"() ->> 'cid'::"text"))::integer) AND (EXISTS ( SELECT 1
   FROM "public"."ev_member" "member"
  WHERE ("raid_loot_reservation"."member_id" = "member"."id"))) AND (EXISTS ( SELECT 1
   FROM "public"."raid_resets"
  WHERE (("raid_resets"."id" = "raid_loot_reservation"."reset_id") AND ("raid_resets"."reservations_closed" = false))))));



CREATE POLICY "Allow members to insert" ON "public"."chat_message_read" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_room_members_view"
  WHERE (("chat_room_members_view"."room_id" IN ( SELECT "chat_messages"."room_id"
           FROM "public"."chat_messages"
          WHERE ("chat_messages"."id" = "chat_message_read"."message_id"))) AND ("auth"."uid"() = ANY ("chat_room_members_view"."member_ids"))))));



CREATE POLICY "Allow members to read" ON "public"."chat_message_read" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."chat_room_members_view"
  WHERE (("chat_room_members_view"."room_id" IN ( SELECT "chat_messages"."room_id"
           FROM "public"."chat_messages"
          WHERE ("chat_messages"."id" = "chat_message_read"."message_id"))) AND ("auth"."uid"() = ANY ("chat_room_members_view"."member_ids")))))));



CREATE POLICY "Allow own update" ON "public"."ev_raid_participant" FOR UPDATE USING (((("auth"."jwt"() ->> 'cid'::"text"))::integer = "member_id"));



CREATE POLICY "Allow users to insert messages " ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."chat_room_members_view"
  WHERE (("chat_room_members_view"."room_id" = "chat_messages"."room_id") AND ("chat_room_members_view"."member_ids" @> ARRAY["auth"."uid"()]))))));



CREATE POLICY "Allow users to read messages from chats they belong" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_room_members_view"
  WHERE (("chat_room_members_view"."room_id" = "chat_messages"."room_id") AND ("chat_room_members_view"."member_ids" @> ARRAY["auth"."uid"()])))));



CREATE POLICY "Allow users to update its own username" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "au"
  WHERE (("au"."user_name" IS NULL) AND ("au"."id" = "auth"."uid"())))) AND ("user_name" IS NOT NULL) AND ("auth"."uid"() = "id")));



CREATE POLICY "Auth can create reservation" ON "public"."raid_loot_reservation" FOR INSERT TO "authenticated" WITH CHECK ((("member_id" = (("auth"."jwt"() ->> 'cid'::"text"))::integer) AND (EXISTS ( SELECT 1
   FROM "public"."ev_member" "member"
  WHERE ("member"."id" = "raid_loot_reservation"."member_id"))) AND (("public"."count_reservations"((("auth"."jwt"() ->> 'cid'::"text"))::integer, "reset_id") < "public"."calculate_total_reservations"("reset_id", (("auth"."jwt"() ->> 'cid'::"text"))::integer)) AND (EXISTS ( SELECT 1
   FROM "public"."raid_resets"
  WHERE (("raid_resets"."id" = "raid_loot_reservation"."reset_id") AND ("raid_resets"."reservations_closed" = false)))))));



CREATE POLICY "Auth can update its own" ON "public"."raid_loot_reservation" FOR UPDATE TO "authenticated" USING ((("member_id" = (("auth"."jwt"() ->> 'cid'::"text"))::integer) AND (EXISTS ( SELECT 1
   FROM "public"."ev_member" "member"
  WHERE ("raid_loot_reservation"."member_id" = "member"."id")))));



CREATE POLICY "Auth user can delete" ON "public"."follows" FOR DELETE TO "authenticated" USING (("follower_id" = "auth"."uid"()));



CREATE POLICY "Auth user can delete their likes" ON "public"."likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Auth user can insert" ON "public"."follows" FOR INSERT TO "authenticated" WITH CHECK ((("follower_id" = "auth"."uid"()) AND ("user_id" <> "follower_id")));



CREATE POLICY "Auth user can perform likes" ON "public"."likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Auth user can read" ON "public"."raid_loot_reservation" FOR SELECT USING (true);



CREATE POLICY "Auth users can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated can create a new chat room" ON "public"."chat_rooms" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Everybody can read" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Everybody can read" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Everyone can insert" ON "public"."raid_resets" FOR INSERT WITH CHECK (true);



CREATE POLICY "Everyone can insert items" ON "public"."wow_items" FOR INSERT WITH CHECK (true);



CREATE POLICY "Everyone can read" ON "public"."ev_loot_history" FOR SELECT USING (true);



CREATE POLICY "Everyone can read" ON "public"."member_rank" FOR SELECT USING (true);



CREATE POLICY "Everyone can read" ON "public"."raid_loot" FOR SELECT USING (true);



CREATE POLICY "Everyone can read" ON "public"."raid_resets" FOR SELECT USING (true);



CREATE POLICY "Everyone can read items" ON "public"."wow_items" FOR SELECT USING (true);



CREATE POLICY "Everyone can select" ON "public"."ev_extra_reservations" FOR SELECT USING (true);



CREATE POLICY "Everyone can update item" ON "public"."wow_items" FOR UPDATE USING (true);



CREATE POLICY "Insert all" ON "public"."ev_application" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK (true);



CREATE POLICY "Only admins can read" ON "public"."ev_admin" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'cid'::"text"))::integer = "id"));



CREATE POLICY "Only the owner can update" ON "public"."chat_message_read" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Owner can add members to its room" ON "public"."chat_room_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_user_owner_of_room"("auth"."uid"(), "room_id"));



CREATE POLICY "admin can update" ON "public"."raid_resets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ev_admin" "admin"
  WHERE ((("auth"."jwt"() ->> 'cid'::"text"))::integer = "admin"."id"))));



CREATE POLICY "all_can_create" ON "public"."ev_member" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow own insert" ON "public"."ev_raid_participant" FOR INSERT WITH CHECK (((("auth"."jwt"() ->> 'cid'::"text"))::integer = "member_id"));



CREATE POLICY "allow_all_update" ON "public"."ev_member" FOR UPDATE USING (true);



ALTER TABLE "public"."blizzard_token" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_message_read" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_room_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_room_members_view" ON "public"."chat_room_members" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."chat_room_members_view"
  WHERE (("chat_room_members_view"."room_id" = "chat_room_members"."room_id") AND ("chat_room_members_view"."member_ids" @> ARRAY["auth"."uid"()])))) OR "public"."is_user_owner_of_room"("auth"."uid"(), "room_id")));



ALTER TABLE "public"."chat_rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_application" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_extra_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_guild_roster_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_loot_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_member" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_member_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_raid" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_raid_participant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ev_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "everyone can read" ON "public"."ev_guild_roster_history" FOR SELECT USING (true);



CREATE POLICY "everyone can read" ON "public"."ev_raid_participant" FOR SELECT USING (true);



CREATE POLICY "everyone_can_read" ON "public"."ev_raid" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "everyone_can_read" ON "public"."raid_loot_item" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."last_raid" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."log_table" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_rank" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raid_loot" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raid_loot_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raid_loot_reservation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raid_resets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_see_own_rooms" ON "public"."chat_rooms" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chat_room_members"
  WHERE ("chat_room_members"."room_id" = "chat_rooms"."id")))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wow_items" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_message_read";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_rooms";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ev_extra_reservations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ev_raid_participant";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."posts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."raid_loot_reservation";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."raid_resets";









GRANT USAGE ON SCHEMA "open_campaign" TO "anon";
GRANT USAGE ON SCHEMA "open_campaign" TO "authenticated";
GRANT USAGE ON SCHEMA "open_campaign" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































GRANT ALL ON FUNCTION "public"."calculate_total_reservations"("reset_uuid" "uuid", "char_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_reservations"("reset_uuid" "uuid", "char_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_reservations"("reset_uuid" "uuid", "char_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_reservations"("member_id_arg" integer, "reset_id_arg" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_molten_core_raid"() TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_molten_core_raid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_molten_core_raid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_raid"("p_interval" interval, "p_raid_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_raid"("p_interval" interval, "p_raid_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_raid"("p_interval" interval, "p_raid_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_rooms"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_rooms"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_rooms"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_roster_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_roster_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_roster_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_last_raid_date"("p_raid_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_last_raid_date"("p_raid_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_last_raid_date"("p_raid_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_ev_member_to_private"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_ev_member_to_private"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_ev_member_to_private"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_alloed_to_see_members"("tu_puta_madre_id" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_alloed_to_see_members"("tu_puta_madre_id" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_alloed_to_see_members"("tu_puta_madre_id" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_allowed_to_see_members"("tu_puta_madre_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_allowed_to_see_members"("tu_puta_madre_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_allowed_to_see_members"("tu_puta_madre_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_owner_of_room"("user_id" "uuid", "room_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_owner_of_room"("user_id" "uuid", "room_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_owner_of_room"("user_id" "uuid", "room_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "anon";
GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_weekly_raids"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_weekly_raids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_weekly_raids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_select_last_raid"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_select_last_raid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_select_last_raid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_enddate"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_enddate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_enddate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_raid_reset_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_raid_reset_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_raid_reset_name"() TO "service_role";















GRANT ALL ON TABLE "open_campaign"."broadlog" TO "anon";
GRANT ALL ON TABLE "open_campaign"."broadlog" TO "authenticated";
GRANT ALL ON TABLE "open_campaign"."broadlog" TO "service_role";












GRANT ALL ON TABLE "public"."blizzard_token" TO "anon";
GRANT ALL ON TABLE "public"."blizzard_token" TO "authenticated";
GRANT ALL ON TABLE "public"."blizzard_token" TO "service_role";



GRANT ALL ON SEQUENCE "public"."blizzard_token_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blizzard_token_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blizzard_token_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chat_message_read" TO "anon";
GRANT ALL ON TABLE "public"."chat_message_read" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message_read" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room_members" TO "anon";
GRANT ALL ON TABLE "public"."chat_room_members" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room_members" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room_members_view" TO "anon";
GRANT ALL ON TABLE "public"."chat_room_members_view" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room_members_view" TO "service_role";



GRANT ALL ON TABLE "public"."ev_admin" TO "anon";
GRANT ALL ON TABLE "public"."ev_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_admin" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ev_admin_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ev_admin_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ev_admin_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ev_application" TO "anon";
GRANT ALL ON TABLE "public"."ev_application" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_application" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ev_application_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ev_application_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ev_application_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ev_extra_reservations" TO "anon";
GRANT ALL ON TABLE "public"."ev_extra_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_extra_reservations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ev_extra_reservation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ev_extra_reservation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ev_extra_reservation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ev_guild_roster_history" TO "anon";
GRANT ALL ON TABLE "public"."ev_guild_roster_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_guild_roster_history" TO "service_role";



GRANT ALL ON TABLE "public"."ev_loot_history" TO "anon";
GRANT ALL ON TABLE "public"."ev_loot_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_loot_history" TO "service_role";



GRANT ALL ON TABLE "public"."ev_member" TO "anon";
GRANT ALL ON TABLE "public"."ev_member" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_member" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ev_member_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ev_member_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ev_member_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ev_member_role" TO "anon";
GRANT ALL ON TABLE "public"."ev_member_role" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_member_role" TO "service_role";



GRANT ALL ON TABLE "public"."ev_raid" TO "anon";
GRANT ALL ON TABLE "public"."ev_raid" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_raid" TO "service_role";



GRANT ALL ON TABLE "public"."ev_raid_participant" TO "anon";
GRANT ALL ON TABLE "public"."ev_raid_participant" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_raid_participant" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ev_raid_participant_member_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ev_raid_participant_member_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ev_raid_participant_member_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ev_role" TO "anon";
GRANT ALL ON TABLE "public"."ev_role" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_role" TO "service_role";



GRANT ALL ON TABLE "public"."ev_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."ev_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."last_raid" TO "anon";
GRANT ALL ON TABLE "public"."last_raid" TO "authenticated";
GRANT ALL ON TABLE "public"."last_raid" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."log_table" TO "anon";
GRANT ALL ON TABLE "public"."log_table" TO "authenticated";
GRANT ALL ON TABLE "public"."log_table" TO "service_role";



GRANT ALL ON TABLE "public"."member_rank" TO "anon";
GRANT ALL ON TABLE "public"."member_rank" TO "authenticated";
GRANT ALL ON TABLE "public"."member_rank" TO "service_role";



GRANT ALL ON SEQUENCE "public"."member_rank_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."member_rank_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."member_rank_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."raid_loot" TO "anon";
GRANT ALL ON TABLE "public"."raid_loot" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_loot" TO "service_role";



GRANT ALL ON TABLE "public"."raid_loot_item" TO "anon";
GRANT ALL ON TABLE "public"."raid_loot_item" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_loot_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."raid_loot_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."raid_loot_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."raid_loot_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."raid_loot_reservation" TO "anon";
GRANT ALL ON TABLE "public"."raid_loot_reservation" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_loot_reservation" TO "service_role";



GRANT ALL ON TABLE "public"."raid_resets" TO "anon";
GRANT ALL ON TABLE "public"."raid_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_resets" TO "service_role";



GRANT ALL ON TABLE "public"."recipients" TO "anon";
GRANT ALL ON TABLE "public"."recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipients" TO "service_role";



GRANT ALL ON TABLE "public"."wow_items" TO "anon";
GRANT ALL ON TABLE "public"."wow_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wow_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wow_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wow_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wow_item_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "open_campaign" GRANT ALL ON TABLES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
