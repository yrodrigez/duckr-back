import { Embed } from "https://deno.land/x/harmony@v2.9.1/mod.ts";

const AI_KEY = Deno.env.get("AI_KEY")!;
const DISC_KEL = Deno.env.get("DISC_KEL")!;
const DISC_RAGNAROS = Deno.env.get("DISC_RAGNAROS")!;
const DISC_CTHUN = Deno.env.get("DISC_CTHUN")!;
const DISC_NEFARIAN = Deno.env.get("DISC_NEFARIAN")!;
const DISC_ZUL = Deno.env.get("DISC_ZUL")!;
const DISC_BALNAZZAR = Deno.env.get("DISC_BALNAZZAR")!;

/**
 * Returns which WoW boss/personality and a placeholder thumbnail to use,
 * based on the raid name in `after`.
 */
function getAnnouncerInfo(raidName: string | undefined) {
    if (!raidName) {
        // Default fallback
        return {
            bossName: "Kel'thuzad",
            webhook: DISC_KEL
        };
    }

    const lowerRaid = raidName.toLowerCase();
    if (lowerRaid.includes("naxx")) {
        return {
            bossName: "Kel'thuzad",
            webhook: DISC_KEL,
        };
    } else if (lowerRaid.includes("zul") || lowerRaid.includes("gurub")) {
        return {
            bossName: "Jin'do",
            webhook: DISC_ZUL,
        };
    } else if (lowerRaid.includes("ahn") || lowerRaid.includes("qiraj") || lowerRaid.includes("aq")) {
        return {
            bossName: "C'thun",
            webhook: DISC_CTHUN,
        };
    } else if (lowerRaid.includes("blackwing") || lowerRaid.includes("bwl")) {
        return {
            bossName: "Nefarian",
            webhook: DISC_NEFARIAN,
        };
    } else if (lowerRaid.includes("molten core") || lowerRaid.includes("ragnaros")) {
        return {
            bossName: "Ragnaros",
            webhook: DISC_RAGNAROS,
        };
    } else if (lowerRaid.includes("scarlet")) {
        return {
            bossName: "Dreadlord Balnazzar",
            webhook: DISC_BALNAZZAR,
        };
    }
    // Default fallback if no match:
    return {
        bossName: "Kel'thuzad",
        webhook: DISC_KEL,
    };
}


// 1) Helper function to call OpenAI with role-based messages
export async function sendPromptToAI(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AI_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(
            `Error fetching AI response - details: ${text}`,
            response.status,
            response.statusText,
        );
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;

    if (!message) {
        console.error("Error: no valid message in AI response", data);
    }

    return message || "";
}

// -------------- PROMPT-GENERATION FUNCTIONS --------------

// 2) Generate a “prompt” (or directly the final announcement) from the JSON body

async function generatePrompt(body: { action: "update" | "create"; before: any; after: any }): Promise<string> {

    const raidName = body?.after?.name;
    const { bossName } = getAnnouncerInfo(raidName);

    const systemMessage = {
        role: "system",
        content: `
      You are a prompt engineer instructing the AI to produce a SHORT, bombastic raid announcement 
      in the voice of ${bossName}. The announcement must:
      - Refer only to the changes in the provided JSON (before vs. after, "create" vs. "update").
      - Use dark humor and a grand, ominous flair.
      - Mention "@everyone" smoothly.
      - Be at most 300 characters long. 
      - Be suitable for Discord.
      - If reservations are closed, remind players briefly to review them.
      - Mark relevant changes in bold using **.
      - Inform of how it was before and how it is now.
    `
    };

    const userMessage = {
        role: "user",
        content: `
        Here is the data about the raid reset changes (before = old state, after = new state):
        ${JSON.stringify(body)}
    `
    };

    return await sendPromptToAI([systemMessage, userMessage]);
}

// -------------- MAIN EXECUTION / DISCORD LOGIC --------------

// 4) The main function that ties it all together
export async function execute(body: { action: "update" | "create"; before: any; after: any }) {
    try {
        // The "after" object should have an .id and a .name for the raid
        const resetId = body?.after?.id;
        const raidName = body?.after?.name;

        const resetURL = `https://www.everlastingvendetta.com/raid/${resetId}`;

        // Step 1: Generate an initial announcement from the JSON data
        const finalMessage = await generatePrompt(body);

        // Step 2: Construct an embed using the harmony `Embed` class
        // If you want to mention @everyone in the embed text itself, you'd do so in `.setDescription(...)`
        // or in a separate "content" argument when you send the message.
        const embed = new Embed()
            .setTitle(`Raid Reset Announcement: ${raidName}`)
            .setURL(resetURL)
            .setDescription(finalMessage)
            .setFooter("Everlasting Vendetta")
            .setColor(0x00ff00);

        const { webhook } = getAnnouncerInfo(raidName);
        // Step 3: POST to your Discord webhook
        const discordWebhookUrl = webhook;

        const payload = {
            embeds: [embed.toJSON()],
        };

        const discordResponse = await fetch(discordWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!discordResponse.ok) {
            const errText = await discordResponse.text();
            console.error("Error posting to Discord:", errText);
        }

        return finalMessage;
    } catch (error) {
        console.error("Error in execute function:", error);
        throw error;
    }
}

Deno.serve(async (req: Request) => {
    try {
        const body = (await req.json()) as {
            action: "update" | "create";
            before: any;
            after: any;
        };

        await execute(body);

        return new Response(
            JSON.stringify({ message: "Discord raid update complete" }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (e) {
        console.error(e);
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
});
