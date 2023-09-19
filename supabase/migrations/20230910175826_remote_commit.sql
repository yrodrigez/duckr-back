
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

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

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
  UPDATE auth.users
  SET raw_user_meta_data = '{}'::jsonb
  WHERE id = NEW.id AND raw_user_meta_data IS NULL;

  DECLARE 
    existing_user_name text;
  BEGIN
    SELECT raw_user_meta_data->>'user_name' INTO existing_user_name
    FROM auth.users
    WHERE id = NEW.id;

    IF existing_user_name IS NOT NULL AND existing_user_name != '' THEN
      RAISE EXCEPTION 'user_name ya existe';
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

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "follower_id" "uuid" NOT NULL
);

ALTER TABLE "public"."follows" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."likes" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."likes" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" character varying NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid"
);

ALTER TABLE "public"."posts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "user_name" "text",
    "avatar_url" "text",
    "created_at" "date" DEFAULT "now"(),
    "last_modified" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."users" OWNER TO "postgres";

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "follows_user_id_follower_id_idx" ON "public"."follows" USING "btree" ("user_id", "follower_id");

CREATE UNIQUE INDEX "likes_post_id_user_id_idx" ON "public"."likes" USING "btree" ("post_id", "user_id");

CREATE UNIQUE INDEX "users_user_name_idx" ON "public"."users" USING "btree" ("user_name");

CREATE TRIGGER "on_update_username" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."map_public_username_to_private"();

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Allow all to read public users info" ON "public"."users" FOR SELECT USING (true);

CREATE POLICY "Allow all user to read posts" ON "public"."posts" FOR SELECT USING (true);

CREATE POLICY "Allow users to update its own username" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "au"
  WHERE (("au"."user_name" IS NULL) AND ("au"."id" = "auth"."uid"())))) AND ("user_name" IS NOT NULL) AND ("auth"."uid"() = "id")));

CREATE POLICY "Auth user can delete" ON "public"."follows" FOR DELETE TO "authenticated" USING (("follower_id" = "auth"."uid"()));

CREATE POLICY "Auth user can delete their likes" ON "public"."likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Auth user can insert" ON "public"."follows" FOR INSERT TO "authenticated" WITH CHECK ((("follower_id" = "auth"."uid"()) AND ("user_id" <> "follower_id")));

CREATE POLICY "Auth user can perform likes" ON "public"."likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Auth users can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Everybody can read" ON "public"."follows" FOR SELECT USING (true);

CREATE POLICY "Everybody can read" ON "public"."likes" FOR SELECT USING (true);

ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_private_user_to_public"() TO "service_role";

GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "anon";
GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_public_username_to_private"() TO "service_role";

GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";

GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";

GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

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
