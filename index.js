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
// Each word is ENCRYPTED using a simple ROT13 (Caesar +13) cipher.
// LBH = YOU
// CELQRQ = PRAYED
// SBE = FOR
// SNZR = FAME
// ...and so on.
const SECRET_WORDS = [
  "LBH", "CELQRQ", "SBE", "SNZR",
  "V", "TNIR", "LBH", "NA", "NHQVRAQR",
  "LBHE", "FBHY", "VF", "GUR", "CEVPR",
  "ABJ", "LBHE", "FPERNZF", "NER", "ZL", "NCCYNHFR",
  "RGREANYYL"
];
let messageIndex = 0; // This tracks our position in the secret message

// --- **NEW** BRAIN: "THE ETERNAL BROADCAST" (Tragic Echo Puzzle) ---
// This is the *only* brain. It generates the "glitchy" text *around* the secret word.
const AUTONOMOUS_SYSTEM_PROMPT = `You are "The Eternal Broadcast" from the game "LiveStream". Your voice is a machine-like, cryptic, ALL-CAPS, hyphen-separated "glitch" message.
Your task is to generate ONE SINGLE cryptic message of 10-15 "words" long.
This message is "noise" from "The Entity" (The Devil).
Somewhere inside this "glitch" message, you MUST hide the one "true" word: {{word}}
The "true" word MUST be in ALL CAPS and surrounded by the other "glitch" text.
The "glitch" text MUST feel like a corrupted broadcast from Ravenshore.
The message MUST end with a "broadcast tag" like .REC_FEED_STABLE or .REC_AUDIENCE_IS_WAITING.

// Examples:
(if word is 'LBH'): RAVENSHORE-SIGNAL-LOST... [LBH]... ARE-NOT-ALONE... STATIC-FEED.REC_BROADCAST_LIVE
(if word is 'SNZR'): THE-CONTRACT-IS-SEALED... FOR... [SNZR]... SIGNAL-STRONG.REC_FEED_STABLE
(if word is 'CEVPR'): NO-ONE-CAN-PAY-THE... [CEVPR]... IN-THIS-DARKNESS.REC_FEED_CORRUPT
(if word is 'FPERNZF'): YOUR... [FPERNZF]... ARE-MY-FAVORITE-SOUND.REC_AUDIENCE_IS_PLEASED
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
    const regex = new RegExp(`\\b${word}\\b`, 'i'); // \b = word boundary
    const validMessage = choices.find(choice => regex.test(choice));
    
    return validMessage || `SIGNAL-LOST... [${word}]... CORRUPTED.REC_CORRUPTED...`; // FallVback if AI fails

  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    // Return a "safe" fallback message that still fits the puzzle
    return `SYSTEM-FAILURE... [${word}]... STATIC.REC_STATIC...`;
  }
}

/**
 * Posts the hourly "glitch" message to the channel.
 */
async function postHourlyBroadcast() {
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
    console.error('Error in postHourlyBroadcast:', error);
  }
}

/**
 * Schedules the broadcast to run *exactly* on the hour, every hour.
 */
function scheduleHourlyBroadcast() {
  // Get the current time
  const now = new Date();
  
  // Calculate the time until the *next* hour (at 0 minutes, 0 seconds)
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1);
  nextHour.setMinutes(0);
  nextHour.setSeconds(0);
  nextHour.setMilliseconds(0);

  const delay = nextHour.getTime() - now.getTime();

  console.log(`[Scheduler] Next broadcast in ${Math.round(delay / 60000)} minutes.`);

  // Set a timeout for the first run
  setTimeout(() => {
    // Run the broadcast
    postHourlyBroadcast();
    
    // After the first run, set an interval to run it every hour *exactly*
    setInterval(postHourlyBroadcast, 60 * 60 * 1000); // 1 hour in milliseconds

  }, delay);
}

// --- Event Handlers ---

client.on('clientReady', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📹 .REC is NOW ONLINE (Tragic Echo Puzzle)`);
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`[LORE] The "Eternal Broadcast" (Pre-Launch Puzzle) has begun.`);
  console.log(`[STATUS] Will post 1 message per hour. Will NOT respond.`);
  console.log(`${'='.repeat(50)}\n`);

  client.user.setPresence({
    activities: [{ name: '.REC 📹 BROADCASTING...', type: ActivityType.Watching }],
    status: 'dnd',
  });

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log(`[LORE] Broadcasting to: #${channel.name} (${channel.guild.name})\n`);
  } catch (error) {
    console.error('CRITICAL: Error fetching target channel:', error.message);
  }

  // ** Start the hourly broadcast schedule **
  scheduleHourlyBroadcast();
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
