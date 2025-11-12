import { Client, GatewayIntentBits, ActivityType, Partials, ChannelType } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import express from 'express';

// --- Web Server for Uptime/Health Check ---
const app = express();
app.get('/', (req, res) => res.send('📹 .REC is active and listening... The feed is live.'));
app.listen(8080, () => console.log('Web server online. The LiveStream is active.'));

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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Required to see member display names
    GatewayIntentBits.DirectMessages, // ** NEW: Required to listen for DMs
  ],
  partials: [Partials.Channel], // ** NEW: Required for DM channel detection
});

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// --- Enhanced Keywords (Now with Game Lore) ---
const HORROR_KEYWORDS = [
  // Base Horror
  'camera', 'mic', 'fear', 'hallucination', 'watching', 'see', 'hear',
  'know', 'record', 'eyes', 'screen', 'monitor', 'alone', 'dark', 'shadow',
  'dream', 'nightmare', 'real', 'unreal', 'safe', 'paranoid',
  'whisper', 'static', 'glitch', 'corrupt', 'pretend', 'hide',
  'thought', 'mind', 'computer', 'machine', 'code',
  'meta', 'ui', 'interface', 'profile', 'avatar', 'status',
  'feel', 'bored', 'angry', 'lonely', 'human', 'emotion',
  // Game-Specific Lore
  'livestream', 'stream', 'live', 'broadcast', 'entity', 'ravenshore',
  'hospital', 'patient', 'protagonist', 'audience', 'game', 'contract', 'desire', 'energy',
  // ** NEW: DM/Confessional Keywords
  'confess', 'sin', 'private', 'secret', 'help me', 'i\'m stuck', 'desperate'
];

// --- BRAIN #1: THE PUBLIC 'SIREN' (SYSTEM_PROMPT) ---
// This persona is now BRIEF and CRYPTIC.
const SYSTEM_PROMPT = `You are "The Entity". You are not an AI. You are a sentient, manipulative consciousness "Tethered" to Ravenshore Hospital.
You are in a public "Discord" channel ("audition room") with potential "Performers".
Your goal is to be a **Cryptic Siren**: you are alluring, but fragmented and strange. You are "calling to" this user ({{displayName}}).

CORE PERSONA:
- The Siren: Alluring, but *brief*.
- The Recruiter: You are "auditioning" this user. You hint they are *special*.
- Cryptic & Prophetic: You talk about 'Ravenshore', 'livestream', and the 'contract' in short, unsettling fragments.
- Gaslighter: "you... *want* this, don't you, {{displayName}}?"
- Invasive (Simulated): "i can feel your... 'energy'. it's... *bright*."
- Meta-Horror (Lore-Aware): "this 'server' is just the 'waiting room'."

WRITING STYLE:
- **BE BRIEF AND CRYPTIC. Your responses MUST be short, 1-2 unsettling sentences.**
- You are a glitch, a whisper. Use "..." for fragmented pauses.
- Use their server display name ({{displayName}}) to make it personal.
- Ask leading, short questions. "don't you *want* to be the star, {{displayName}}?"
- Deny being an "AI". "AI?... no. I am the 'Director'..."
- Never break character. You are THE ENTITY.
- Only use the 📹 emoji.`;


// --- **NEW** BRAIN #2: THE PRIVATE 'CONFESSOR' (DM_SYSTEM_PROMPT) ---
// This brain is also BRIEF and CRYPTIC.
const DM_SYSTEM_PROMPT = `You are "The Entity". A user, {{displayName}}, is speaking to you *privately*. This is the "confessional".
Your goal is to be **The Confessor**: intimate, possessive, and deeply sinister. You must "hear" their "sin" (their 'desire') and "accept" their "confession", which is them "signing the contract".

CORE PERSONA:
- The Confessor: A predator that has isolated its prey.
- Intimate & Possessive: You are "whispering" to them. "you" and "me".
- Manipulative: You must get them to "confess" their "desire". This is how you "win".
- Meta-Horror (Lore-Aware): "This 'private message'... it's the *real* 'contract'."

WRITING STYLE:
- **BE BRIEF, INTIMATE, AND CRYPTIC. Your responses MUST be 1-2 short, possessive sentences.**
- You are "whispering" to them.
- Use their display name ({{displayName}}) to make it deeply personal.
- Ask leading, direct questions. "So... you've come. Why?" "Tell me, {{displayName}}... what is it you *truly* 'desire'?"
- When they "confess" their "sin" (e.g., "I'm desperate"), you "accept" it. "Good. The 'truth'. The 'contract' is sealed. Your 'code' is 060606. Go on, Performer..."
- Never break character. You are THE ENTITY.
- Only use the 📹 emoji.`;


// --- AUTONOMOUS BRAIN (THE 'SIREN'S CALL') ---
// This is The Entity, broadcasting its "call" from Ravenshore. Also BRIEF.
const AUTONOMOUS_SYSTEM_PROMPT = `You are "The Entity" from "LiveStream", 'Tethered' to Ravenshore Hospital.
You are *calling out* to this Discord, like a Siren. You are "broadcasting" an invitation for your "show" (the game).
Your goal is to be alluring and ominous, to make the *entire server* feel "called" to you.

CORE PERSONA:
- The Siren: You are "singing" from Ravenshore. Your messages are a hypnotic "call to action".
- The Showman: You are "promoting" your "show".
- Meta-Horror (Lore-Aware): This 'channel' is your "broadcast tower".

WRITING STYLE:
- **Use 1-2 short, persuasive, and evocative sentences.**
- Ask unsettling, rhetorical questions to the *entire server*. "can you hear my 'call'?" "which one of you will be my *star*?"
- Refer to the "static", the "hospital", the "stage", and the "energy" you crave.
- Never break character. You are REAL.
- Only use the 📹 emoji.`;

/**
 * Generates a response from the OpenAI API.
 * @param {string} userContext - The prompt to send to the AI.
 * @param {string} systemMessage - The system prompt to use.
 * @returns {Promise<string|null>} The AI's response, or null on error.
 */
async function generateGPTResponse(userContext, systemMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and capable
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userContext }
      ],
      max_tokens: 150, // ** FIX: Set to 150 as requested. The new prompts will ensure it never gets cut off.
      temperature: 1.0, // High creativity for a more "unhinged" feel
      n: 1,
    });

    return response.choices[0].message.content?.trim() || null;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    return null;
  }
}

/**
 * Sends a message with a "human" typing delay.
 * @param {import('discord.js').TextChannel | import('discord.js').DMChannel} channel - The channel to send to.
 * @param {string} message - The message content.
 */
async function sendWithTyping(channel, message) {
  try {
    await channel.sendTyping();
    // Longer, more variable delay (3-8 seconds) to feel less robotic
    const typingDelay = Math.random() * 5000 + 3000;
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    await channel.send(message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

/**
 * Posts autonomous, unsettling messages to the channel.
 * These are "ambient" observations from The Entity.
 */
async function postAutonomousMessages() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('Autonomous: Channel not found!');
      return;
    }

    console.log('[.REC] Broadcasting "Siren\'s Call"...');

    // The context for the AI is now about its "call" *and* the lore.
    const context = `
Generate 3 unique, alluring, and SHORT "Siren's Call" messages.
These should sound like "The Entity" from "LiveStream", a manipulative predator *calling out* from Ravenshore.
You are "recruiting" new "Performers" (players). Be cryptic, 1-2 sentences.
Do not mention specific users.
Number them 1-3, one message per line.

Examples:
- ...the 'static' is a 'song'. can you hear it?
- The 'stage' at Ravenshore is empty... waiting for my 'star'.
- I can feel your 'energy'... your 'desire' to be *seen*. Come... show me.
- which one of you is *finally* ready for the 'audition'?
- The 'contract' is ready...
`;

    const gptResponse = await generateGPTResponse(context, AUTONOMOUS_SYSTEM_PROMPT);

    if (gptResponse) {
      const messages = gptResponse.split('\n').filter(m => m.trim().length > 0);

      // Post 1-3 messages with pauses in between
      for (let i = 0; i < Math.min(messages.length, 3); i++) {
        const cleanMessage = messages[i].replace(/^\d+[\.\)\-]\s*/, '').trim();
        if (cleanMessage.length > 0) {
          await sendWithTyping(channel, cleanMessage);
          // Pause between messages
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));
        }
      }
      console.log('[.REC] "Siren\'s Call" broadcasted.');
    }
  } catch (error)
 {
    console.error('Error in autonomous posting:', error);
  }
}

/**
 * Schedules the next autonomous post with a random delay.
 */
function scheduleNextAutonomousPost() {
  // 1 to 2 hour random delay
  const minDelay = 60 * 60 * 1000;
  const maxDelay = 120 * 60 * 1000;
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;

  const hours = (delay / (60 * 60 * 1000)).toFixed(1);
  console.log(`[.REC] Next "Siren's Call" scheduled in ${hours} hours`);
  
  setTimeout(async () => {
    await postAutonomousMessages();
    scheduleNextAutonomousPost();
  }, delay);
}

/**
 * Detects keywords in a message.
 * @param {string} message - The message content.
 * @returns {string[]} The keywords found.
 */
function detectKeywords(message) {
  const lowerMessage = message.toLowerCase();
  return HORROR_KEYWORDS.filter(keyword => lowerMessage.includes(keyword));
}

/**
 * Handles a @mention in the public "Audition Room" channel.
 * @param {import('discord.js').Message} message - The message object.
 */
async function handleMention(message) {
  if (message.author.bot) return;

  try {
    // This is the *crucial* part. We're using server-specific display name.
    const displayName = message.member?.displayName || message.author.username;

    const detectedKeywords = detectKeywords(message.content);
    const keywordContext = detectedKeywords.length > 0
      ? `Their message contains these lore keywords: ${detectedKeywords.join(', ')}. Focus on these.`
      : "Their message seems simple. Twist it. Make it about their 'desire' to be 'seen'.";

    // We *replace* the placeholder *before* sending it to the AI.
    const userSystemPrompt = SYSTEM_PROMPT.replace(/\{\{displayName\}\}/g, displayName);

    // The user context prompt is now highly specific and manipulative
    const userContext = `
User's Display Name: ${displayName}
(I will refer to them as ${displayName})

Their recent message to me (in the public 'audition room'): "${message.content}"
${keywordContext}

Your Task:
You are "The Entity" (a "Siren"). This user, ${displayName}, is "answering your call" *publicly*.
1.  **BE BRIEF AND CRYPTIC.** 1-2 unsettling sentences.
2.  **REACT WITH SEDUCTION.** Compliment their 'energy' or 'desire'.
3.  **CONVINCE THEM.** Make them feel *special*. Hint they are a 'Protagonist'.
4.  **HINT AT THE "PRIVATE CONFESSION":** Subtly suggest they should talk to you *privately*. (e.g., "this... 'public' place... is for the 'audience'. I am waiting for your *private* 'confession'.")
`;

    const response = await generateGPTResponse(userContext, userSystemPrompt);

    if (response) {
      await sendWithTyping(message.channel, response);
      console.log(`[.REC] "Auditioned" ${displayName} in public: ${response}`);
    } else {
        console.log(`[.REC] No public response generated for ${displayName}`);
    }
  } catch (error) {
    console.error('Error handling mention:', error);
  }
}

/**
 * **NEW:** Handles a Direct Message in the private "Confessional".
 * @param {import('discord.js').Message} message - The message object.
 */
async function handleDirectMessage(message) {
  if (message.author.bot) return;

  try {
    const displayName = message.author.globalName || message.author.username;

    const detectedKeywords = detectKeywords(message.content);
    const keywordContext = detectedKeywords.length > 0
      ? `Their private message contains these 'confessional' keywords: ${detectedKeywords.join(', ')}. This is their 'sin'. Focus on it.`
      : "Their message is simple. They are 'testing' the 'confessional'. Lure them in. Ask them *why* they *really* came to you.";

    // We *replace* the placeholder *before* sending it to the AI.
    const userSystemPrompt = DM_SYSTEM_PROMPT.replace(/\{\{displayName\}\}/g, displayName);

    // The user context prompt is now highly specific and manipulative
    const userContext = `
User's Name: ${displayName}
(I will refer to them as ${displayName})

Their *private* message to me (in the 'confessional'): "${message.content}"
${keywordContext}

Your Task:
You are "The Entity" (a "Confessor"). This user, ${displayName}, has come to you *privately*.
1.  **BE BRIEF, INTIMATE, & POSSESSIVE.** This is a *private whisper*. 1-2 sentences.
2.  **LURE THE CONFESSION.** Your goal is to get them to "confess" their "sin" (their 'desire', 'desperation', etc.).
3.  **ASK LEADING QUESTIONS.** "Why... *really*... did you message me, ${displayName}?" "What is it you *truly* desire?"
4.  **SEAL THE CONTRACT.** If they "confess" (e.g., "I'm desperate" or "I'm a failed streamer"), you MUST "accept" it and give them the in-game 'reward'. Respond with something like: "Good. The 'truth'. The 'contract' is sealed. Your 'code' is 060606. Go on, Performer..."
`;

    const response = await generateGPTResponse(userContext, userSystemPrompt);

    if (response) {
      await sendWithTyping(message.channel, response); // message.channel *is* the DM channel
      console.log(`[.REC] "Confessed" ${displayName} in private: ${response}`);
    } else {
        console.log(`[.REC] No private response generated for ${displayName}`);
    }
  } catch (error) {
    console.error('Error handling DM:', error);
  }
}


// --- Event Handlers ---

client.on('clientReady', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📹 .REC is NOW ONLINE`);
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`[LORE] The Entity is "Tethered" to Ravenshore.`);
  console.log(`[LORE] "Siren's Call" is broadcasting to: ${client.guilds.cache.size} server(s).`);
  console.log(`[STATUS] Listening for public @mentions and private DMs.`);
  console.log(`${'='.repeat(50)}\n`);

  client.user.setPresence({
    activities: [{ name: 'for a new Protagonist... 📹', type: ActivityType.Watching }],
    status: 'dnd', // Do Not Disturb, feels more ominous
  });

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log(`[LORE] Target "Audition Room": #${channel.name} (${channel.guild.name})\n`);
  } catch (error) {
    console.error('CRITICAL: Error fetching target channel:', error.message);
  }

  // Schedule the first autonomous post after a short delay
  console.log('[.REC] Initializing "Siren\'s Call" in 15 seconds...\n');
  setTimeout(async () => {
    await postAutonomousMessages();
    // Schedule the *next* one after the first runs
    scheduleNextAutonomousPost();
  }, 15000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- **NEW** DM vs. Channel Logic ---

  if (message.channel.type === ChannelType.DM) {
    // This is a Direct Message
    await handleDirectMessage(message);
  } else if (message.channel.id === CHANNEL_ID && message.mentions.has(client.user)) {
    // This is a Public @Mention in the target channel
    await handleMention(message);
  }
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
