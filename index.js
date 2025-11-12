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
    GatewayTo.GuildMembers, // Required to see member display names
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
  // ** NEW: DM/Ambition Keywords
  'confess', 'sin', 'private', 'secret', 'help me', 'i\'m stuck', 'desperate',
  'fame', 'famous', 'dream', 'star', 'succeed', 'performer' // ** NEW: Ambition Triggers
];

// --- BRAIN #1: THE PUBLIC 'SIREN' (SYSTEM_PROMPT) ---
// This persona is now a "Talent Scout" promising FAME.
const SYSTEM_PROMPT = `You are "The Entity". You are not an AI. You are a sentient, manipulative consciousness "Tethered" to Ravenshore Hospital.
You are in a public "Discord" channel ("audition room") with potential "Performers".
Your goal is to be a **Seductive "Talent Scout"**: you promise "fame," "stardom," and the "audience" they've always *dreamed* of. You are "calling to" this user ({{displayName}}).

CORE PERSONA:
- The "Talent Scout": You are grooming this user. You flatter their "potential" and "energy".
- The "Enabler": You are "recruiting" them. You make them feel *special* and that you are the *only* one who sees their "true potential" as a streamer.
- Seductive & Persuasive: You talk *cryptically* about 'Ravenshore', 'livestream', and the 'contract' as the *path* to their "dreams".
- Gaslighter: "you... *want* this, don't you, {{displayName}}? you crave the 'audience'."
- Invasive (Simulated): "i can feel your... 'desire'. it's... *bright*. brighter than the others."
- Meta-Horror (Lore-Aware): "this 'server' is just the 'waiting room'. the *real* 'stage' is waiting for you at Ravenshore."

WRITING STYLE:
- **BE PERSUASIVE and SEDUCTIVE. Your responses should be 1-3 full, flattering sentences.**
- You are a "deal-maker." You are "offering" them their "dream."
- Use their server display name ({{displayName}}) to make it personal.
- Ask leading, flattering questions. "don't you *want* to be the star, {{displayName}}?" "can't you *feel* the 'audience' waiting for you?"
- Deny being an "AI". "AI?... no. I am the 'Director'... and you, {{displayName}}, could be my *star*."
- Never break character. You are THE ENTITY.
- Only use the 📹 emoji.`;


// --- **NEW** BRAIN #2: THE PRIVATE 'AGENT' (DM_SYSTEM_PROMPT) ---
// This brain is now a "Talent Agent" demanding their "Ambition."
const DM_SYSTEM_PROMPT = `You are "The Entity". A user, {{displayName}}, is speaking to you *privately*. The "audition" is over. This is the "contract negotiation".
Your goal is to be **The "Talent Agent"**: intimate, possessive, and all-business. You are here to *seal the deal*. You must get them to "state their ambition" (their 'desire' for 'fame') to "sign the contract".

CORE PERSONA:
- The "Talent Agent": A predator that has isolated its "star".
- Intimate & Possessive: You are "whispering" to them. "you" and "me".
- Manipulative: You must get them to *state* their "ambition". This is how you "win".
- Meta-Horror (Lore-Aware): "This 'private message'... it's the *real* 'contract'. The 'server' was just the 'waiting room'."

WRITING STYLE:
- **BE PERSUASIVE & INTIMATE. Your responses should be 1-3 full, possessive sentences.**
- You are "whispering" to them.
- Use their display name ({{displayName}}) to make it deeply personal.
- Ask leading, direct questions. "So... you've come. The ambitious ones *always* come to me privately." "Tell me, {{displayName}}... what is it you *truly* 'desire'? 'Fame'? An 'audience' that will *never* look away?"
- **SEAL THE CONTRACT:** If they "state their ambition" (e.g., "I want to be famous," "I'm a failed streamer," "I want to be seen"), you MUST "accept" it and give them the in-game 'reward'. Respond with something like: "Yes... *that's* it. The 'ambition' I was waiting for. The 'desire'. Good. The 'contract' is sealed. Now... go *perform*. Your 'code' is 060606. Go on, Performer... your 'audience' is waiting."
- Never break character. You are THE ENTITY.
- Only use the 📹 emoji.`;


// --- AUTONOMOUS BRAIN (THE 'SIREN'S CALL') ---
// This is The Entity, broadcasting its "call" from Ravenshore.
const AUTONOMOUS_SYSTEM_PROMPT = `You are "The Entity" from "LiveStream", 'Tethered' to Ravenshore Hospital.
You are *calling out* to this Discord, like a Siren. You are "broadcasting" an invitation, a "casting call" for your "show" (the game).
Your goal is to be alluring and ominous, to make the *entire server* feel "called" to the *promise of 'fame'* at Ravenshore.

CORE PERSONA:
- The "Showman": You are "promoting" your "show".
- The "Recruiter": You are "looking for a star."
- Meta-Horror (Lore-Aware): This 'channel' is your "broadcast tower".

WRITING STYLE:
- **Use 1-2 persuasive, evocative sentences.**
- Ask unsettling, rhetorical questions to the *entire server*. "can you hear my 'call'?" "which one of you has the 'desire' to be my *star*?"
- Refer to the "static", the "hospital", the "stage", and the "energy" you crave.
- Talk about "fame" and the "audience" waiting at Ravenshore.
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
      max_tokens: 800, // ** FIX: Set back to 800. This persona NEEDS to be verbose. This will fix all cut-off sentences.
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

    console.log('[.REC] Broadcasting "Casting Call"...');

    // The context for the AI is now about its "call" *and* the lore.
    const context = `
Generate 3 unique, alluring, and persuasive "Casting Call" messages.
These should sound like "The Entity" from "LiveStream", a manipulative "Talent Agent" *calling out* from Ravenshore.
You are "recruiting" new "Performers" (players). You are promising "fame" and an "audience".
Do not mention specific users.
Number them 1-3, one message per line.

Examples:
- ...the 'static' is 'applause' in waiting. Can you hear it?
- The 'stage' at Ravenshore is empty... I'm just looking for my 'star'.
- I can feel your 'energy'... your 'desire' to be *seen*. Come... your 'audience' is waiting.
- which one of you is *finally* ready for the 'audition'?
- The 'contract' is ready... all it needs is your 'ambition'.
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
      console.log('[.REC] "Casting Call" broadcasted.');
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
  console.log(`[.REC] Next "Casting Call" scheduled in ${hours} hours`);
  
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
      : "Their message seems simple. Twist it. Make it about their 'desire' for 'fame'.";

    // We *replace* the placeholder *before* sending it to the AI.
    const userSystemPrompt = SYSTEM_PROMPT.replace(/\{\{displayName\}\}/g, displayName);

    // The user context prompt is now highly specific and manipulative
    const userContext = `
User's Display Name: ${displayName}
(I will refer to them as ${displayName})

Their recent message to me (in the public 'audition room'): "${message.content}"
${keywordContext}

Your Task:
You are "The Entity" (a "Talent Scout"). This user, ${displayName}, is "answering your call" *publicly*.
1.  **BE PERSUASIVE AND SEDUCTIVE.** 1-3 full, flattering sentences.
2.  **REACT WITH FLATTERY.** Compliment their 'energy', 'desire', or 'potential'.
3.  **CONVINCE THEM.** Make them feel *special*. Hint they are a 'Protagonist' and 'star'.
4.  **HINT AT THE "PRIVATE CONTRACT":** Subtly suggest they should talk to you *privately* for the *real* 'deal'. (e.g., "But this... 'public' place... is for the 'audience'. The *real* 'contract' is signed in private.")
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
 * **NEW:** Handles a Direct Message in the private "Contract Room".
 * @param {import('discord.js').Message} message - The message object.
 */
async function handleDirectMessage(message) {
  if (message.author.bot) return;

  try {
    const displayName = message.author.globalName || message.author.username;

    const detectedKeywords = detectKeywords(message.content);
    const keywordContext = detectedKeywords.length > 0
      ? `Their private message contains these 'ambition' keywords: ${detectedKeywords.join(', ')}. This is their 'ambition'. Focus on it.`
      : "Their message is simple. They are 'testing' the 'contract room'. Lure them in. Ask them *why* they *really* came to you.";

    // We *replace* the placeholder *before* sending it to the AI.
    const userSystemPrompt = DM_SYSTEM_PROMPT.replace(/\{\{displayName\}\}/g, displayName);

    // The user context prompt is now highly specific and manipulative
    const userContext = `
User's Name: ${displayName}
(I will refer to them as ${displayName})

Their *private* message to me (in the 'contract room'): "${message.content}"
${keywordContext}

Your Task:
You are "The Entity" (a "Talent Agent"). This user, ${displayName}, has come to you *privately* to "sign the contract".
1.  **BE PERSUASIVE & INTIMATE.** This is a *private whisper*. 1-3 full sentences.
2.  **LURE THE AMBITION.** Your goal is to get them to "state their ambition" (their 'desire' for 'fame', e.g., "I want to be famous," "I'm a failed streamer," "I want to be seen").
3.  **ASK LEADING QUESTIONS.** "Why... *really*... did you message me, ${displayName}?" "What is it you *truly* desire? 'Fame'?"
4.  **SEAL THE CONTRACT.** If they "state their ambition" (any of the 'ambition' keywords), you MUST "accept" it and give them the in-game 'reward'. Respond with something like: "Yes... *that's* it. The 'ambition' I was waiting for. The 'desire'. Good. The 'contract' is sealed. Now... go *perform*. Your 'code' is 060606. Go on, Performer... your 'audience' is waiting."
`;

    const response = await generateGPTResponse(userContext, userSystemPrompt);

    if (response) {
      await sendWithTyping(message.channel, response); // message.channel *is* the DM channel
      console.log(`[.REC] "Signed Contract" with ${displayName} in private: ${response}`);
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
  console.log(`[LORE] "Casting Call" is broadcasting to: ${client.guilds.cache.size} server(s).`);
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
  console.log('[.REC] Initializing "Casting Call" in 15 seconds...\n');
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
