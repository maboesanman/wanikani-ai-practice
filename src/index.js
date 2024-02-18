// load .env, then .env.dev, then .env.local
import './dotfile_config.js';

import OpenAI from 'openai';
import { ChannelType, Client, GatewayIntentBits, Partials, SlashCommandBuilder } from 'discord.js';

import { getVocabList } from "./get_wk_data.js";
import { getGenki } from "./get_genki_data.js";

const openai = new OpenAI(process.env.OPENAI_API_KEY);

console.log("fetching wanikani...");
const vocabList = await getVocabList();
const genki = await getGenki();

const known = [
  ...vocabList.guru_i,
  ...vocabList.guru_ii,
  ...vocabList.master,
  ...vocabList.enlightened,
  ...vocabList.burned,
];

const learning = [
  ...vocabList.apprentice_i,
  ...vocabList.apprentice_ii,
  ...vocabList.apprentice_iii,
  ...vocabList.apprentice_iv,
];

const activelyLearning = [
  ...vocabList.apprentice_i,
  ...vocabList.apprentice_ii,
];

// console.log("generating story...");
// const completion = await openai.chat.completions.create({
//   model: "gpt-4-0125-preview",
//   messages: [
//     { role: "system", content: "You are a japanese instructor." },
//     { role: "system", content: "The student is an english speaker learning japanese, and you should use simple words and grammar."},
//     { role: "system", content: `The following is a list of words the student has learned: ${JSON.stringify(known)}` },
//     { role: "system", content: `The following is a list of words the student is actively learning: ${JSON.stringify(learning)}` },
//     { role: "system", content: "Do not use any words the student does not know or is not learning."},
//     { role: "system", content: "The student is learning kanji, and you should not replace any kanji with hiragana."},
//     { role: "system", content: `The student is learning grammar from the Genki textbook. They are currently on book ${genki.book}, chapter ${genki.chapter}.`},
//     { role: "system", content: `for each of these words: ${JSON.stringify(activelyLearning)} Create a sentance to practice vocabulary the student is actively learning. Use grammar constructs up to their chapter in Genki` },
//   ],
// });

// console.log(completion.choices[0].message.content);

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
  ]
});

let messageHistory = [];
let messageLastUpdated = new Date();

function updateMessageHistory(message) {
  messageHistory.push(message);
  messageLastUpdated = new Date();
}

function getMessages() {
  let now = new Date();
  if (messageHistory.length === 0 || now - messageLastUpdated > 60 * 60) {
    messageLastUpdated = now;
    return [
      {role: "system", content: "You are a helpful assistant."},
    ]
  } else {
    return messageHistory;
  }
}

client.once('ready', async () => {
  console.log('Ready!');
});

client.on('messageCreate', async message => {
  // don't reply to ourselves
  if (message.author.bot) {
    return;
  }

  // don't reply to anyone but me. openai is expensive.
  if (message.author.id != "134201282222096384") {
    console.log("message from someone else");
    message.reply("I'm sorry, I can only respond to my creator.");
    return;
  }

  // we didn't ask for the guild intent so idk what else could be here...
  if (message.channel.type !== ChannelType.DM) {
    return;
  }

  console.log(`Got a DM from ${message.author.tag}: ${message.content}`);

  let sendTyping = message.channel.sendTyping();
  updateMessageHistory({role: "user", content: message.content})
  let messages = getMessages();
  console.log("messages", messages);
  const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
  });
  let assistantResponse = completion.choices[0].message.content;
  updateMessageHistory({role: "assistant", content: assistantResponse })
  await sendTyping;
  message.channel.send(assistantResponse)
});

await client.login(process.env.DISCORD_BOT_TOKEN);

console.log("bot started");
