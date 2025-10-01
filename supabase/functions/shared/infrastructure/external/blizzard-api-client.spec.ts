import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { BlizzardOauthService } from "./blizzard-generic-token-api-client.ts";

// Store original fetch
const originalFetch = globalThis.fetch;

function mockFetch(response: Response | Promise<Response>) {
  globalThis.fetch = () => Promise.resolve(response);
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function setupEnv() {
  Deno.env.set("BLIZZARD_CLIENT_ID", "test-client-id");
  Deno.env.set("BLIZZARD_CLIENT_SECRET", "test-client-secret");
}

Deno.test("BlizzardApiClient - constructor - should initialize with default values", () => {
  const client = new BlizzardOauthService();
  assertEquals(client.allowedRealms, ["living-flame", "spineshatter"]);
  assertEquals(client.allowedGuilds, ["everlasting-vendetta"]);
});

Deno.test("BlizzardApiClient - constructor - should accept custom parameters", () => {
  const customClient = new BlizzardOauthService(
    "https://custom.api.com",
    "https://custom.oauth.com",
    "test-token"
  );
  assertEquals(customClient.allowedRealms, ["living-flame", "spineshatter"]);
});

Deno.test("BlizzardApiClient - authHeaders - should throw error when token is not provided", () => {
  const clientWithoutToken = new BlizzardOauthService();

  try {
    (clientWithoutToken as any).authHeaders;
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals((error as Error).message, "Token not provided for authenticated requests.");
  }
});

Deno.test("BlizzardApiClient - authHeaders - should create proper authorization header when token is provided", () => {
  const clientWithToken = new BlizzardOauthService(
    "https://eu.api.blizzard.com",
    "https://oauth.battle.net",
    "test-access-token"
  );

  const headers = (clientWithToken as any).authHeaders;
  assertEquals(headers.get("Authorization"), "Bearer test-access-token");
});

Deno.test("BlizzardApiClient - refreshTokenHeaders - should create proper headers for token refresh", () => {
  setupEnv();

  const client = new BlizzardOauthService();
  const headers = (client as any).refreshTokenHeaders;
  assertEquals(headers.get("Content-Type"), "application/x-www-form-urlencoded");

  const expectedAuth = "Basic " + btoa("test-client-id:test-client-secret");
  assertEquals(headers.get("Authorization"), expectedAuth);
});

Deno.test("BlizzardApiClient - fetchToken - should successfully fetch a new token", async () => {
  setupEnv();

  const client = new BlizzardOauthService();
  const mockResponse = {
    access_token: "new-access-token",
    token_type: "Bearer",
    expires_in: 3600,
  };

  mockFetch(
    new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  const token = await client.fetchToken();

  assertEquals(token.access_token, "new-access-token");
  assertEquals(typeof token.expires_at, "number");
  assertEquals(typeof token.created_at, "number");

  restoreFetch();
});

Deno.test("BlizzardApiClient - fetchToken - should throw error when API returns error response", async () => {
  setupEnv();

  const client = new BlizzardOauthService();
  mockFetch(
    new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    })
  );

  await assertRejects(
    async () => await client.fetchToken(),
    Error,
    "Failed to fetch new token: Unauthorized - Unauthorized"
  );

  restoreFetch();
});

Deno.test("BlizzardApiClient - fetchToken - should throw error when API returns invalid JSON", async () => {
  setupEnv();

  const client = new BlizzardOauthService();
  mockFetch(
    new Response("Invalid JSON", { status: 200 })
  );

  await assertRejects(
    async () => await client.fetchToken(),
    Error
  );

  restoreFetch();
});

Deno.test("BlizzardApiClient - constants - should have valid realm names", () => {
  const client = new BlizzardOauthService();
  assertEquals(client.allowedRealms.length, 2);
  assertEquals(client.allowedRealms.includes("living-flame"), true);
  assertEquals(client.allowedRealms.includes("spineshatter"), true);
});

Deno.test("BlizzardApiClient - constants - should have valid guild names", () => {
  const client = new BlizzardOauthService();
  assertEquals(client.allowedGuilds.length, 1);
  assertEquals(client.allowedGuilds.includes("everlasting-vendetta"), true);
});

Deno.test("BlizzardApiClient - integration - should handle token refresh workflow", async () => {
  setupEnv();

  const client = new BlizzardOauthService();
  const mockTokenResponse = {
    access_token: "fresh-token",
    token_type: "Bearer",
    expires_in: 3600,
  };

  mockFetch(
    new Response(JSON.stringify(mockTokenResponse), { status: 200 })
  );

  // Fetch new token
  const token = await client.fetchToken();

  // Create new client with the token
  const authenticatedClient = new BlizzardOauthService(
    "https://eu.api.blizzard.com",
    "https://oauth.battle.net",
    token.access_token
  );

  // Verify the authenticated client can create auth headers
  const headers = (authenticatedClient as any).authHeaders;
  assertEquals(headers.get("Authorization"), "Bearer fresh-token");

  restoreFetch();
});