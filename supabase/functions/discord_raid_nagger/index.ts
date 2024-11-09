// Import necessary modules
import { type SupabaseClient } from "npm:@supabase/supabase-js";
import createClient from "../ev_token_generate/supabase/index.ts";
import { Embed } from "https://deno.land/x/harmony@v2.9.1/mod.ts";
import { toZonedTime } from "https://esm.sh/date-fns-tz";
import { addDays, differenceInHours } from "https://esm.sh/date-fns";

const timeZone = "Europe/Madrid";

// Constants
const erdoganUrl = Deno.env.get("DISCORD_RAID_NAGGER_WEBHOOK_URL");
const putinUrl = Deno.env.get("DISCORD_PUTIN");
const trumpUrl = Deno.env.get("DISCORD_TRUMP");
const chavezUrl = Deno.env.get("DISCORD_CHAVEZ");

const AI_KEY = Deno.env.get("AI_KEY");

function pickDictator() {
  const dictators = [{
    name: "Erdogan",
    url: erdoganUrl,
  }, {
    name: "Vladimir Putin",
    url: putinUrl,
  }, {
    name: "Donald Trump",
    url: trumpUrl,
  }, {
    name: "Hugo Chavez",
    url: chavezUrl,
  }];

  return dictators[Math.floor(Math.random() * dictators.length)];
}

async function generateRaidReminderMessage(
  raidName: string,
  startsIn: string,
  reminderMessage: string,
  link: string,
  dictator: string,
): Promise<string> {
  const prompt =
    `Compose an epic and bombastic message for a raid group named Everlasting Vendetta to subscribe on the "${raidName}" raid, which starts in ${startsIn}. Encourage them to subscribe in the web, and unleash their fury. the message should not exceed 1000 characters. mocking ${dictator} president in a funny dictatorship way. the subscribe link is ${link}. is a discord message and should always mention @everyone smoothly.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error(
      "Error fetching AI response",
      response.status,
      response.statusText,
    );
    return `The time has come, heroes! ${raidName} awaits, and we’re starting in just ${startsIn}! \n\nGear up, review your tactics, and prepare to unleash fury! \n${reminderMessage} \n\n${link}`;
  }

  const data = await response.json();

  const message = data?.choices[0]?.message?.content;
  if (!message) {
    console.error("Error fetching AI response", data);
  }
  return message ||
    `The time has come, heroes! ${raidName} awaits, and we’re starting in just ${startsIn}! \n\nGear up, review your tactics, and prepare to unleash fury! \n${reminderMessage} \n\n${link}`;
}

const REMINDER_TYPES = {
  RAID_IN_96_HOUR: 5,
  RAID_IN_48_HOUR: 4,
  RAID_IN_24_HOUR: 3,
  RAID_IN_6_HOUR: 2,
  RAID_IN_1_HOUR: 1,
  RAID_IN_15_MINUTES: 0,
};

interface ReminderConfig {
  type: number;
  message: string;
  interval: number;
}

const REMINDER_CONFIGS: ReminderConfig[] = [
  {
    type: REMINDER_TYPES.RAID_IN_6_HOUR,
    message: `Make sure you're signed up!`,
    interval: 6,
  },
  {
    type: REMINDER_TYPES.RAID_IN_1_HOUR,
    message: `Finalize your preparations and sign up!`,
    interval: 2,
  },
  {
    type: REMINDER_TYPES.RAID_IN_15_MINUTES,
    message: `Invites starting soon!`,
    interval: 0.25,
  },
  {
    type: REMINDER_TYPES.RAID_IN_24_HOUR,
    message: `Sign up now!`,
    interval: 24,
  },
  {
    type: REMINDER_TYPES.RAID_IN_48_HOUR,
    message: `Sign up now!`,
    interval: 48,
  },
  {
    type: REMINDER_TYPES.RAID_IN_96_HOUR,
    message: `Sign up now!`,
    interval: 96,
  },
];

// Type Definitions
interface RaidReset {
  id: string;
  raid_date: string;
  time: string;
  raid: { name: string; image: string };
  participants: { is_confirmed: boolean }[];
}

// Main Function
Deno.serve(async () => {
  try {
    const supabase = createClient();
    //const now = new Date();
    const now = toZonedTime(new Date(), timeZone);

    // Fetch upcoming raids
    const upcomingRaids = await fetchUpcomingRaids(supabase, now);

    if (!upcomingRaids.length) {
      console.log("No upcoming raids in the next 6 hours.");
      return new Response(
        JSON.stringify({ message: "No upcoming raids in the next 6 hours." }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Process each raid
    for (const raid of upcomingRaids) {
      await processRaidReminders(supabase, raid, now);
    }

    return new Response(
      JSON.stringify({ message: "Raid reminder processing completed." }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error processing raid reminders:", error);
    return new Response(
      JSON.stringify({ message: "Error processing raid reminders." }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});

/**
 * Fetches upcoming raids within the next 6 hours.
 */
async function fetchUpcomingRaids(
  supabase: SupabaseClient,
  now: Date,
): Promise<RaidReset[]> {
  const { data: raids, error } = await supabase
    .from("raid_resets")
    .select(
      "id, raid_date, time, raid:ev_raid(name, image), participants:ev_raid_participant(is_confirmed)",
    )
    .gte("raid_date", now.toISOString())
    .lte("raid_date", addDays(now, 2).toISOString())
    .order("raid_date", { ascending: true })
    .returns<RaidReset[]>();

  if (error) {
    console.error("Error fetching upcoming raids:", error);
    throw error;
  }

  return raids || [];
}

/**
 * Processes reminders for a single raid.
 */
async function processRaidReminders(
  supabase: SupabaseClient,
  raid: RaidReset,
  now: Date,
) {
  const raidDate = toZonedTime(
    new Date(`${raid.raid_date}T${raid.time}.000Z`),
    timeZone,
  );

  const timeUntilRaidInHours = differenceInHours(raidDate, now);

  for (const reminder of REMINDER_CONFIGS) {
    if (!shouldSendReminder(timeUntilRaidInHours, reminder.interval)) {
      console.log(
        `Skipping reminder type ${reminder.type} for raid reset ID ${raid.id}, time until raid: ${timeUntilRaidInHours} hours.`,
      );
      continue;
    }

    // Check if a reminder has been sent in the last 30 minutes
    const canSend = await canSendReminder(supabase, raid.id, reminder.type);

    if (canSend) {
      const link = `https://www.everlastingvendetta.com/raid/${raid.id}`;
      const startsIn = timeUntilRaidInHours < 1
        ? `${Math.round(timeUntilRaidInHours * 60)} minutes`
        : `${Math.round(timeUntilRaidInHours)} hours`;

      const dictator = pickDictator();

      const reminderMessage = await generateRaidReminderMessage(
        raid.raid.name,
        startsIn,
        reminder.message,
        link,
        dictator.name,
      );
      const embed = new Embed()
        .setTitle(`**Raid Reminder: 🔥🔥 ${raid.raid.name} 🔥🔥**`)
        .setURL(link)
        .setDescription(reminderMessage)
        .setFooter(
          `Total registrations: ${
            raid.participants.filter(({ is_confirmed }) => is_confirmed)?.length
          }`,
        )
        .setThumbnail(`https://www.everlastingvendetta.com/${raid.raid.image}`)
        .setColor(0x00FF00);

      await sendReminder(embed, dictator.url!);
      await logReminderSent(supabase, raid.id, reminder.type);
      console.log(
        `Sent reminder type ${reminder.type} for raid reset ID ${raid.id}`,
      );
      break; // Only send one reminder per raid every 30 minutes
    } else {
      console.log(
        `Reminder recently sent for raid reset ID ${raid.id}, skipping.`,
      );
    }
  }
}

/**
 * Determines if a reminder should be sent based on the time until the raid.
 */
function shouldSendReminder(
  timeUntilRaidInHours: number,
  reminderInterval: number,
): boolean {
  const executionIntervalInHours = 0.25; // 15 minutes
  const lowerBound = reminderInterval - executionIntervalInHours;
  const upperBound = reminderInterval;
  console.log(
    `Checking if reminder should be sent, time until raid: ${timeUntilRaidInHours} hours, interval: ${reminderInterval} hours.`,
  );
  console.log(`Lower bound: ${lowerBound}, upper bound: ${upperBound}`);
  return timeUntilRaidInHours <= upperBound &&
    timeUntilRaidInHours > lowerBound;
}

/**
 * Checks if a reminder can be sent (i.e., not sent in the last 30 minutes).
 */
async function canSendReminder(
  supabase: SupabaseClient,
  resetId: string,
  reminder_type: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("event_reminder")
    .select("reminder_date:event_date")
    .eq("reset_id", resetId)
    .eq("reminder_type", reminder_type)
    .order("event_date", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking last reminder time:", error);
    throw error;
  }

  if (data && data.length > 0) {
    return false;
  }

  // No reminders sent yet
  return true;
}

/**
 * Sends a reminder message to Discord.
 */
async function sendReminder(message: Embed, url: string) {
  if (!url) {
    console.error("url is not set.");
    throw new Error("url is not set.");
  }

  console.log("Sending Discord reminder:", message);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [message],
      message: "@everyone <@everyone>",
      allowed_mentions: { parse: ["everyone"] },
    }),
  });

  if (!response.ok) {
    console.error("Failed to send Discord reminder:", await response.text());
    throw new Error("Failed to send Discord reminder");
  }
  console.log("Discord reminder sent successfully.");
  console.log("Response", await response.text());
}

/**
 * Logs that a reminder has been sent.
 */
async function logReminderSent(
  supabase: SupabaseClient,
  resetId: string,
  reminderType: number,
) {
  const { error } = await supabase.from("event_reminder").insert({
    reset_id: resetId,
    reminder_type: reminderType,
  });

  if (error) {
    console.error("Error logging reminder:", error);
    throw error;
  }
}
