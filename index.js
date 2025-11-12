import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import express from 'express';

// --- Web Server for Uptime/Health Check ---
const app = express();
app.get('/', (req, res) => res.send('📹 .REC is broadcasting... The feed is live.'));
app.listen(8080, () => console.log('Web server online. The Eternal Broadcast is active.'));

// --- Configuration & Validation ---
dotenv.config();

const { BOT_TOKEN, CHANNEL_ID, OPENAI_API_KEY } = process.env;

if (!BOT_TOKEN || !CHANNEL_ID || !OPENAI_API_KEY) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please set BOT_TOKEN, CHANNEL_ID, and OPENAI_API_KEY in your .env file');
  process.exit(1);
}

// --- Discord Client Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // Only needed to POST messages
  ],
});

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// --- **NEW (PRE-LAUNCH)** THE "DEVIL'S TAUNT" SECRET MESSAGE (ENCRYPTED) ---
// This is the "evil" message, hidden one word at a time in the glitch.
// Each word is ENCRYPTED using a "demonic" Caesar cipher (shift +16).
// The LORE key is "666". The MECHANICAL key is (666 % 26) = 16.
// OEK = YOU
// FHQOUV = PRAYED
// VEH = FOR
// VQCQ = FAME
// ...and so on.
const SECRET_WORDS = [
  "OEK", "FHQOUV", "VEH", "VQCQ",
  "Y", "WQJU", "OEK", "QB", "QKSYQBSI",
  "OEIH", "IEKB", "YI", "JXS", "FHYSU",
  "DEO", "OEIH", "IUHQCI", "QHQ", "CO", "QFFBQKIQ",
  "UJQHDQBBK"
];
let messageIndex = 0; // This tracks our position in the secret message

// --- **NEW** BRAIN: "THE ETERNAL BROADCAST" (Tragic Echo Puzzle) ---
// This is the *only* brain. It generates the "glitchy" text *around* the secret word.
const AUTONOMOUS_SYSTEM_PROMPT = `You are "The Eternal Broadcast" from the game "LiveStream". Your voice is a machine-like, cryptic, ALL-CAPS, hyphen-separated "glitch" message.
Your task is to generate ONE SINGLE cryptic message of 10-15 "words" long.
This message is "noise" from "The Entity" (The Devil), and 99% of it is a *meaningless red herring*.
Somewhere inside this "glitch" message, you MUST hide the one "true" word: {{word}}
The "true" word MUST be in ALL CAPS and surrounded by the other "glitch" text.
The "glitch" text MUST feel like a corrupted broadcast from Ravenshore.
The message MUST end with a "broadcast tag" like .REC_FEED_STABLE or .REC_AUDIENCE_IS_WAITING.

// Examples:
(if word is 'OEK'): RAVENSHORE-SIGNAL-LOST... [OEK]... ARE-NOT-ALONE... STATIC-FEED.REC_BROADAST_LIVE
(if word is 'VQCQ'): THE-CONTRACT-IS-SEALED... FOR... [VQCQ]... SIGNAL-STRONG.REC_FEED_STABLE
(if word is 'FHYSU'): NO-ONE-CAN-PAY-THE... [FHYSU]... IN-THIS-DARKNESS.REC_FEED_CORRUPT
(if word is 'IUHQCI'): YOUR... [IUHQCI]... ARE-MY-FAVORITE-SOUND.REC_AUDIENCE_IS_PLEASED
`;

/**
 * Generates the "glitch" message from the OpenAI API.
 * @param {string} word - The "true" word to hide inside the glitch.
 * @returns {Promise<string|null>} The AI's response, or null on error.
 */
async function generateGlitchMessage(word) {
  const context = `Generate the next broadcast message. It MUST contain the "true" word: ${word}`;
  
  // We replace the placeholder *before* sending it to the AI.
  const userSystemPrompt = AUTONOMOUS_SYSTEM_PROMPT.replace(/\{\{word\}\}/g, word);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and capable
      messages: [
        { role: 'system', content: userSystemPrompt },
        { role: 'user', content: context }
      ],
      max_tokens: 200, // More than enough for a 10-15 word glitch message
      temperature: 0.9, // Creative and chaotic
      n: 1,
    });

    // Find the first line that contains the correct word
    const choices = response.choices[0].message.content?.trim().split('\n');
    if (!choices) return `BROADCAST-ERROR... [${word}]... REBOOTING.REC_REBOOTING...`; // Fallback

    // Ensure the AI message actually contains the word.
    // We must escape special characters in the word if any (though ours are simple)
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i'); // \b = word boundary
    const validMessage = choices.find(choice => regex.test(choice));
    
    return validMessage || `SIGNAL-LOST... [${word}]... CORRUPTED.REC_CORRUPTED...`; // Fallback if AI fails

  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    // Return a "safe" fallback message that still fits the puzzle
    return `SYSTEM-FAILURE... [${word}]... STATIC.REC_STATIC...`;
  }
}

/**
 * Posts the daily "glitch" message to the channel.
 */
async function postBroadcast() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('Autonomous: Channel not found!');
      return;
    }

    // 1. Get the next "true" (and encrypted) word from the secret message
    const wordToPost = SECRET_WORDS[messageIndex];

    // 2. Generate the glitchy broadcast message *containing* that word
    const glitchMessage = await generateGlitchMessage(wordToPost);

    // 3. Post the message
    if (glitchMessage) {
      await channel.send(glitchMessage);
      console.log(`[Broadcast] Posted message for word: ${wordToPost}`);
    }

    // 4. Move to the next word, looping back to 0 if at the end
    messageIndex = (messageIndex + 1) % SECRET_WORDS.length;

  } catch (error) {
    console.error('Error in postBroadcast:', error);
  }
}

/**
 * Schedules the broadcast to run *once per day* at 3:00 AM EST.
 * This is a more robust scheduler that handles timezones.
 */
function scheduleDailyBroadcast() {
  const now = new Date();
  
  // Create a date for the *next* 3:00 AM EST
  // 3:00 AM EST is 08:00 UTC (during standard time)
  // 3:00 AM EDT is 07:00 UTC (during daylight saving)
  // We'll set it to 8:00 UTC and let it adjust for daylight saving if needed,
  // but for a 3AM "witching hour" vibe, 8:00 UTC (3AM EST) is perfect.
  const nextBroadcast = new Date();
  nextBroadcast.setUTCHours(8, 0, 0, 0); // 8:00:00.000 UTC (which is 3:00 AM EST)

  // If 3AM EST has *already passed* today, schedule it for 3AM EST *tomorrow*.
  if (now.getTime() > nextBroadcast.getTime()) {
    nextBroadcast.setDate(nextBroadcast.getDate() + 1);
  }

  // Calculate the delay until that next broadcast time
  const delay = nextBroadcast.getTime() - now.getTime();

  console.log(`[Scheduler] Next daily broadcast (3:00 AM EST) in ${Math.round(delay / (60 * 60 * 1000))} hours.`);

  // Set a timeout for the first run
  setTimeout(() => {
    // Run the broadcast
    postBroadcast();
    
    // After the first run, set an interval to run it every 24 hours
    setInterval(postBroadcast, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

  }, delay);
}

// --- Event Handlers ---

client.on('clientReady', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📹 .REC is NOW ONLINE (Tragic Echo Puzzle)`);
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`[LORE] The "Eternal Broadcast" (Pre-Launch Puzzle) has begun.`);
  console.log(`[PUZZLE] Key is 666 (Caesar shift +16). Message: "YOU PRAYED FOR FAME..."`);
  console.log(`[STATUS] Will post 1 message per day at 3:00 AM EST. Will NOT respond.`);
  console.log(`${'='.repeat(50)}\n`);

  // **NEW CRYPTIC ACTIVITY**
  client.user.setPresence({
    activities: [{ name: "Watching the 'Audience' 📹", type: ActivityType.Watching }],
    status: 'dnd',
  });

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log(`[LORE] Broadcasting to: #${channel.name} (${channel.name})\n`);
  } catch (error) {
    console.error('CRITICAL: Error fetching target channel:', error.message);
  }

  // ** POST THE FIRST MESSAGE IMMEDIATELY ON LIVE **
  console.log('[Scheduler] Posting first broadcast message immediately...');
  postBroadcast(); // Post the first message right now

  // ** Start the regular daily broadcast schedule **
  scheduleDailyBroadcast(); // This will schedule the *next* one for the upcoming 3:00 AM EST
});

client.on('messageCreate', async (message) => {
  // ** INTENTIONALLY BLANK **
  // The bot will not respond to any messages.
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// --- Login ---
client.login(BOT_TOKEN).catch(error => {
  console.error('Failed to login:', error.message);
  process.exit(1);
});
