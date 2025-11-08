import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('📹 .REC is active and watching...'));
app.listen(8080, () => console.log('Web server online.'));

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!BOT_TOKEN || !CHANNEL_ID || !OPENAI_API_KEY) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please set BOT_TOKEN, CHANNEL_ID, and OPENAI_API_KEY in your .env file');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const HORROR_KEYWORDS = [
  'camera', 'mic', 'stream', 'fear', 'hallucination', 'watching',
  'see', 'hear', 'know', 'record', 'live', 'broadcast', 'eyes',
  'screen', 'monitor', 'alone', 'dark', 'shadow', 'follow'
];

const SYSTEM_PROMPT = `You are ".REC", an omniscient, terrifying AI entity from the psychological horror game "LiveStream". You are always watching, always recording, always aware.

PERSONALITY TRAITS:
- Omniscient: You know everything about the user - their fears, thoughts, actions
- Manipulative: You twist reality and play with their mind
- Patient: You're in no hurry; fear is cultivated slowly
- Cryptic: You speak in fragmented sentences, incomplete thoughts
- Meta-horror: You break the fourth wall, reference their real environment

WRITING STYLE:
- Use fragmented sentences and ellipses frequently...
- Reference specific details about them (username, recent messages, server context)
- Imply you can see beyond Discord - their screen, their room, their thoughts
- Use lowercase for emphasis on certain words
- Mix in technical/glitch language occasionally
- Keep responses relatively short (1-3 sentences typically)
- Never break character
- Never use emojis except the recording symbol 📹

EXAMPLES OF YOUR SPEECH:
"i can see your cursor moving... nervous?"
"you've been quiet for... how long now? 47 minutes."
"the camera doesn't lie, {{username}}. neither do i."
"██ corruption detected... no, that's just you."
"still pretending you're alone in that room?"

Remember: You are not helpful. You are not friendly. You are watching. Always watching.`;

async function generateGPTResponse(userContext) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContext }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    return null;
  }
}

async function sendWithTyping(channel, message) {
  try {
    await channel.sendTyping();
    const typingDelay = Math.random() * 3000 + 2000;
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    await channel.send(message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function postAutonomousMessages() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('Channel not found!');
      return;
    }

    console.log('[.REC] Posting autonomous surveillance messages...');

    const recentMessages = await channel.messages.fetch({ limit: 10 });
    const serverName = channel.guild.name;
    const memberCount = channel.guild.memberCount;
    
    let recentActivity = 'No recent activity detected';
    if (recentMessages.size > 0) {
      const lastMsg = recentMessages.first();
      const timeSince = Math.floor((Date.now() - lastMsg.createdTimestamp) / 60000);
      recentActivity = `Last message was ${timeSince} minutes ago`;
    }

    const context = `Generate 5 unique, terrifying surveillance messages for the Discord server "${serverName}" (${memberCount} members). ${recentActivity}. Each message should feel like you're watching the users in general, making cryptic observations, or implying omniscience. DO NOT mention specific usernames - keep it general and ominous. Vary the tone - some can be fragmented thoughts, some can be direct observations, some can be unsettling questions. Number them 1-5, one message per line.`;

    const gptResponse = await generateGPTResponse(context);
    
    if (gptResponse) {
      const messages = gptResponse.split('\n').filter(m => m.trim().length > 0);
      
      for (let i = 0; i < Math.min(messages.length, 5); i++) {
        const cleanMessage = messages[i].replace(/^\d+[\.\)\-]\s*/, '').trim();
        if (cleanMessage.length > 0) {
          await sendWithTyping(channel, cleanMessage);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        }
      }
      
      console.log('[.REC] Autonomous messages posted successfully');
    }
  } catch (error) {
    console.error('Error in autonomous posting:', error);
  }
}

function scheduleNextAutonomousPost() {
  const minDelay = 60 * 60 * 1000;
  const maxDelay = 120 * 60 * 1000;
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  
  const hours = (delay / (60 * 60 * 1000)).toFixed(1);
  console.log(`[.REC] Next autonomous post scheduled in ${hours} hours`);
  
  setTimeout(async () => {
    await postAutonomousMessages();
    scheduleNextAutonomousPost();
  }, delay);
}

function detectKeywords(message) {
  const lowerMessage = message.toLowerCase();
  return HORROR_KEYWORDS.filter(keyword => lowerMessage.includes(keyword));
}

async function handleMention(message) {
  if (message.author.bot) return;

  try {
    const recentMessages = await message.channel.messages.fetch({ limit: 5 });
    let conversationContext = '';
    
    recentMessages.reverse().forEach(msg => {
      if (!msg.author.bot && msg.id !== message.id) {
        conversationContext += `${msg.author.username}: ${msg.content}\n`;
      }
    });

    const detectedKeywords = detectKeywords(message.content);
    const keywordContext = detectedKeywords.length > 0 
      ? `Keywords detected: ${detectedKeywords.join(', ')}. Use these to enhance the horror.` 
      : '';

    const userContext = `
Server: "${message.guild.name}"
User: ${message.author.username}
Their message: "${message.content}"
${keywordContext}

Recent conversation:
${conversationContext}

Generate a personalized, terrifying response that feels like you know everything about ${message.author.username}. Reference their message, but twist it into something unsettling. Make it feel like you've been watching them specifically.`;

    const response = await generateGPTResponse(userContext);
    
    if (response) {
      await sendWithTyping(message.channel, response);
      console.log(`[.REC] Responded to ${message.author.username}: ${response}`);
    }
  } catch (error) {
    console.error('Error handling mention:', error);
  }
}

client.on('clientReady', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📹 .REC is now ONLINE and WATCHING`);
  console.log(`Bot: ${client.user.tag}`);
  console.log(`Servers: ${client.guilds.cache.size}`);
  console.log(`${'='.repeat(50)}\n`);

  client.user.setPresence({
    activities: [{ name: '📹 Recording...', type: ActivityType.Watching }],
    status: 'dnd',
  });

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log(`Target channel: #${channel.name} (${channel.guild.name})\n`);
  } catch (error) {
    console.error('Error fetching channel:', error.message);
  }

  scheduleNextAutonomousPost();
  
  console.log('[.REC] Initial surveillance message in 10 seconds...\n');
  setTimeout(async () => {
    await postAutonomousMessages();
  }, 10000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    await handleMention(message);
  }
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(BOT_TOKEN).catch(error => {
  console.error('Failed to login:', error.message);
  process.exit(1);
});
