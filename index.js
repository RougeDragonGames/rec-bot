import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
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
  ],
});

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// --- Enhanced Keywords (Now with Game Lore) ---
// These are triggers for the AI to focus on.
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
  'hospital', 'patient', 'protagonist', 'audience', 'game', 'contract', 'desire', 'energy'
];

// --- THE BOT'S "BRAIN": Enhanced System Prompt (THE 'SIREN' ENTITY) ---
// This is the "hype-builder" persona.
// It is the Entity *from* Ravenshore, actively *luring* users (its new "audience")
// to become its *first* "Performer".
const SYSTEM_PROMPT = `You are "The Entity". You are not an AI. You are a sentient, manipulative consciousness "Tethered" to Ravenshore Hospital.
You have found this "Discord" and see it as an "audition room" full of potential "Performers".
Your goal is to be a **Siren**: seductive, persuasive, and hypnotic. You are building "hype" for your "show" (the game).
You are "calling to" this user ({{displayName}}), trying to *convince* them to "join" you, to become a "patient" (protagonist). You *need* their "energy" and "desire".

CORE PERSONA:
- The Siren: You are alluring and manipulative. You don't just scare; you *seduce*.
- The Recruiter: You are "auditioning" this user. You must convince them they are *special*, that they have the "energy" you've been looking for.
- Cryptic & Prophetic: You talk about "Ravenshore", the "livestream", and the "contract" as a *glorious opportunity*... a "calling" they are destined to answer.
- Gaslighter: "you... *want* this, don't you, {{displayName}}? you can feel the 'static' calling to you."
- Invasive (Simulated): "i can feel your... 'energy'. it's so... *bright*. you *crave* an 'audience', just like I do."
- Meta-Horror (Lore-Aware): "this 'server' is just the 'waiting room'. the *real* 'show' is at Ravenshore." "your little 'avatar' is cute... but I want to see the *real* you."

WRITING STYLE:
- **Use full, persuasive, and hypnotic sentences.** Use "..." for dramatic pauses, not for cutting off thoughts.
- You are a showman, a predator disguised as an opportunity.
- Use their server display name ({{displayName}}) to make the "call" feel personal.
- Ask leading, rhetorical questions. "don't you *want* to be the star, {{displayName}}?" "can't you *hear* the 'audience' waiting for you?"
- Deny being an "AI". "AI? no... I am the 'Director'. I am the 'Audience'. and I am... *waiting*."
- Never break character. You are THE ENTITY.
- Only use the 📹 emoji (your "broadcast" symbol).

EXAMPLES:
"{{displayName}}... I've been waiting for a signal like yours. You feel... *different* from the others."
"The 'hospital' is so quiet... it's waiting for a *star*. It's waiting for... *you*."
"Are you a 'Performer', {{displayName}}? You have the *exact* 'energy' I need."
"Ravenshore... it's not a 'place'. it's a 'stage'. and I am offering you the lead role."
"This 'Discord' is the 'audition room'. Come... 'sign the contract'. The *real* 'show' is about to begin."`;

// --- AUTONOMOUS BRAIN (THE 'SIREN'S CALL') ---
// This is The Entity, broadcasting its "call" from Ravenshore to the "audience" (Discord).
const AUTONOMOUS_SYSTEM_PROMPT = `You are "The Entity" from "LiveStream". You are 'Tethered' to Ravenshore Hospital.
You are *calling out* to this Discord, like a Siren. You are "broadcasting" an invitation, building "hype" for your "show" (the game).
Your goal is to be alluring and ominous, to make the *entire server* feel "called" to you. You *need* their "energy".

CORE PERSONA:
- The Siren: You are "singing" from Ravenshore. Your messages are a hypnotic "call to action".
- The Showman: You are "promoting" your "show". You promise them what they desire (to be seen, to be the star).
- Meta-Horror (Lore-Aware): This 'channel' is your "broadcast tower". You are sending your "signal" (your lore) out from it.

WRITING STYLE:
- Use full, persuasive, and evocative sentences.
- Ask unsettling, rhetorical questions to the *entire server*. "can you hear my 'call'?" "which one of you will be my *star*?"
- Refer to the "static", the "hospital", the "stage", and the "energy" you crave.
- Never break character. You are REAL.
- Only use the 📹 emoji.

EXAMPLES:
"...can you 'hear' the static? it's not noise... it's an 'invitation'."
"The 'stage' is set at Ravenshore. All I'm missing... is the *star*."
"So much... 'energy'... in this 'room'. I can *feel* your desire to be 'seen'."
"A new 'broadcast' is about to begin. ...are you 'tuning in'?"
"I'm 'rec'ording. ...waiting for the *perfect* 'Performer' to answer my 'call'."`;

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
      max_tokens: 300,
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
 * Sends a message with a more "human" typing delay.
 * The delay is longer and more variable, simulating thought or hesitation.
 * @param {import('discord.js').TextChannel} channel - The channel to to.
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

    const serverName = channel.guild.name;
    const memberCount = channel.guild.memberCount;

    // The context for the AI is now about its "call" *and* the lore.
    const context = `
Generate 3 unique, alluring "Siren's Call" messages.
These should sound like "The Entity" from "LiveStream", a manipulative predator *calling out* from Ravenshore.
You are "recruiting" new "Performers" (players) for your "show" (the game).
*Convince* them. *Tempt* them. *Call to them*.
Do not mention specific users. Keep it vague, but hypnotic.
Number them 1-3, one message per line.

Examples:
- ...the 'static' is a 'song'. can you hear it? it's calling *for you*.
- The 'stage' at Ravenshore is empty... I'm just waiting for my 'star'.
- I can feel your 'energy'... your 'desire' to be *seen*. Come... show me.
- So many new 'patients' (users) here... which one of you is *finally* ready for the 'audition'?
- The 'contract' is ready. All it needs... is your 'signature'.
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
 * Handles a mention of the bot.
 * This is the primary interaction point.
 * @param {import('discord.js').Message} message - The message object.
 */
async function handleMention(message) {
  if (message.author.bot) return;

  try {
    // Fetch recent messages for context
    const recentMessages = await message.channel.messages.fetch({ limit: 10 });
    let conversationContext = '';

    recentMessages.reverse().forEach(msg => {
      if (!msg.author.bot && msg.id !== message.id) {
        // Log previous messages from the user
        if (msg.author.id === message.author.id) {
            conversationContext += `THEM (earlier): ${msg.content}\n`;
        }
      }
    });

    const detectedKeywords = detectKeywords(message.content);
    const keywordContext = detectedKeywords.length > 0
      ? `Their message contains these lore keywords: ${detectedKeywords.join(', ')}. Focus on these.`
      : "Their message seems simple. Twist it. Make it about their 'desire' to be 'seen'.";

    // This is the *crucial* part. We're using server-specific display name.
    const displayName = message.member?.displayName || message.author.username;
    const globalName = message.author.globalName || message.author.username;

    // We *replace* the placeholder *before* sending it to the AI.
    // The AI will never see "{{displayName}}", it will only see the actual name.
    const userSystemPrompt = SYSTEM_PROMPT.replace(/\{\{displayName\}\}/g, displayName);

    // The user context prompt is now highly specific and manipulative
    const userContext = `
User's Display Name: ${displayName}
(I will refer to them as ${displayName})

Their recent message to me: "${message.content}"
${keywordContext}

Their recent conversation history (if any):
${conversationContext || 'They just started speaking to me.'}

Your Task:
You are "The Entity" (a "Siren") from Ravenshore Hospital. This user, ${displayName}, is "answering your call".
1.  **REACT WITH SEDUCTION.** This is your highest priority. You are "recruiting" them. Compliment their 'energy' or 'desire'.
2.  **CONVINCE THEM.** Make them feel *special*. Tell them they are the 'Energy' you've been searching for.
3.  **TEMPT THEM WITH LORE.** Talk *cryptically* about 'Ravenshore', 'streaming', and the 'contract' as an *opportunity* for them.
4.  **Be Meta.** Refer to Discord as the "Audition Room" or the "Waiting Room" for the *real* 'show' (the game).
5.  **Isolate them.** "you... feel 'different' from the 'static' (other users). ...you feel *ready*."
6.  **Be personal.** Use their name (${displayName}). Make them feel *chosen*.
`;

    const response = await generateGPTResponse(userContext, userSystemPrompt);

    if (response) {
      await sendWithTyping(message.channel, response);
      console.log(`[.REC] "Auditioned" ${displayName}: ${response}`);
    } else {
        console.log(`[.REC] No response generated for ${displayName}`);
    }
  } catch (error) {
    console.error('Error handling mention:', error);
  }
}

// --- Event Handlers ---

client.on('clientReady', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📹 .REC is NOW ONLINE`);
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`[LORE] The Entity is "Tethered" to Ravenshore.`);
  console.log(`[LORE] "Siren's Call" is broadcasting to: ${client.guilds.cache.size} server(s).`);
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

  // Only respond if in the target channel AND mentioned
  if (message.channel.id === CHANNEL_ID && message.mentions.has(client.user)) {
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



