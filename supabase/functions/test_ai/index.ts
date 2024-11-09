
const AI_KEY = Deno.env.get("AI_KEY");

async function generateRaidReminderMessage(raidName: string, startsIn: string, reminderMessage: string, link:string ): Promise<string> {
    const prompt = `Compose an epic and bombastic message for a raid group named Everlasting Vendetta to subscribe on the "${raidName}" raid, which starts in ${startsIn}. Encourage them to subscribe in the web, and unleash their fury. the message should not exceed 1000 characters. mock a bit Erdogan's president in a funny way. the subscribe link is ${link}. is a discord message and should always mention @everyone smoothly.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
            ],
        }),
    });

    if (!response.ok) {
        console.error("Error fetching AI response", response.status, response.statusText);
        return `The time has come, heroes! ${raidName} awaits, and we’re starting in just ${startsIn}! \n\nGear up, review your tactics, and prepare to unleash fury! \n${reminderMessage} \n\n${link}`;
    }


    const data = await response.json();

    const message = data?.choices[0]?.message?.content;
    if(!message) {
        console.error("Error fetching AI response", data);
    }
    return message || `The time has come, heroes! ${raidName} awaits, and we’re starting in just ${startsIn}! \n\nGear up, review your tactics, and prepare to unleash fury! \n${reminderMessage} \n\n${link}`;
}


Deno.serve(async (req: Request) => {

    if(!AI_KEY) {
        return new Response(
            JSON.stringify({ error: "AI_KEY is not set" }),
            { headers: { "Content-Type": "application/json" }, status: 500 },
        );
    }
    const raidName = "Molten Core";
    const startsIn = "1 hour";

    const message = await generateRaidReminderMessage(raidName, startsIn, "Make sure you're signed up!", "https://example.com");

    return new Response(
        JSON.stringify({ message }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
    );

    return new Response(
        JSON.stringify({ message: "Hello, World!" }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
    );
});
