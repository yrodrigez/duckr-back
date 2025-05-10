import prompt from "./prompt.ts";
import createClient from "../ev_token_generate/supabase/index.ts";
const AI_KEY = Deno.env.get("AI_KEY")!;

async function sendPromptToAI(messages: { role: string; content: string }[]): Promise<string> {
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

Deno.serve(async (req: Request) => {
    const url = new URL(req.url);
    const { searchParams } = url;

    const resetId = searchParams.get('resetId');
    if(!resetId) {
        return new Response(JSON.stringify({error: 'Reset ID is required'}), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const supabase = createClient();
    const {data, error} = await supabase
        .from("ev_raid_participant")
        .select("member:ev_member!inner(character), details, updated_at, created_at")
        .eq("raid_id", resetId)
        .neq("details->>status", "declined")
        .neq("details->>status", "bench")
        .order("created_at", {ascending: false})
        .order("updated_at", {ascending: false})
        .returns<{
            member: {
                character: {
                    name: string;
                    playable_class: {
                        name: string;
                    }
                };
            };
            details: {
                role: 'tank' | 'healer' | 'dps';
                status: string;
            };
            updated_at: string;
        }[]>();

    if (error) {
        console.error("Error fetching participants:", error);
        return new Response(JSON.stringify({error: 'Error fetching participants'}), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const participants = data.map((participant) => {
        return {
            name: participant.member.character.name,
            class: participant.member.character.playable_class.name,
            role: participant.details.role,
        };
    });

    const composition = await sendPromptToAI([{
        role: "system",
        content: prompt,
    }, {role: "user", content: `${JSON.stringify(participants, null, 2)}`,}])

    if (!composition) {
        return new Response('Error sending prompt to AI', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    return new Response(JSON.stringify({composition: composition}), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
});
