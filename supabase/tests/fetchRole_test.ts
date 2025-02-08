import {fetchRoles} from "../functions/ev_token_generate/use-cases/fetchRoles.ts";
import { assertArrayIncludes, assertExists } from "jsr:@std/assert";

const NOT_VALID_USER_ID = 0;
const VALID_USER_ID = 40982076;
const ADMIN_USER_ID = 40982076;
const RAIDER_USER_ID = 35039708;
const MODERATOR_USER_ID = 40981736;
const NOT_IN_DB_USER_ID = 29978812;

const ADMIN_ROLE = "ADMIN";
const MODERATOR_ROLE = "MODERATOR";
const RAIDER_ROLE = "RAIDER";

Deno.test("fetches roles successfully", async () => {
    const roles = await fetchRoles(VALID_USER_ID);
    console.log(roles);

    assertExists(roles);
});

Deno.test("fetches roles successfully for admin", async () => {
    const roles = await fetchRoles(ADMIN_USER_ID);
    console.log(roles);

    assertArrayIncludes(roles, [ADMIN_ROLE]);
});

Deno.test("fetches roles successfully for raider", async () => {
    const roles = await fetchRoles(RAIDER_USER_ID);
    console.log(roles);
    assertArrayIncludes(roles, [RAIDER_ROLE]);
});

Deno.test("fetches roles successfully for moderator", async () => {
    const roles = await fetchRoles(MODERATOR_USER_ID);
    console.log(roles);
    assertArrayIncludes(roles, [MODERATOR_ROLE]);
});

Deno.test("fetches roles successfully for not valid user", async () => {
    const roles = await fetchRoles(NOT_VALID_USER_ID);
    console.log(roles);
    assertArrayIncludes(roles, []);
});

Deno.test("fetches roles successfully for not in db user", async () => {
    const roles = await fetchRoles(NOT_IN_DB_USER_ID);
    console.log(roles);
    assertArrayIncludes(roles, []);
});
