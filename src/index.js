// load .env, then .env.dev, then .env.local
import './dotfile_config.js';

import OpenAI from 'openai';
import { ChannelType, Client, GatewayIntentBits, Partials, SlashCommandBuilder } from 'discord.js';

import { getVocabList } from "./get_wk_data.js";
import { getGenki } from "./get_genki_data.js";
import { MessageManager } from "./message_manager.js";
import { loopWhile } from "./promise_looper.js";

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const model = "gpt-4-0125-preview";

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
  ]
});

let messageManager = new MessageManager(async () => {
  console.log("fetching wanikani...");
    const vocabList = await getVocabList();

    console.log("fetching genki...");
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

    return [
      { role: "system", content: "You are a japanese instructor." },
      { role: "system", content: "The student is an english speaker learning japanese, and you should use simple words and grammar."},
      { role: "system", content: `The following is a list of words the student has learned: ${JSON.stringify(known)}` },
      { role: "system", content: `The following is a list of words the student is actively learning: ${JSON.stringify(learning)}` },
      { role: "system", content: "Do not use any words the student does not know or is not learning."},
      { role: "system", content: "The student is learning kanji, and you should not replace any kanji with hiragana."},
      { role: "system", content: `The student is learning grammar from the Genki textbook. They are currently on book ${genki.book}, chapter ${genki.chapter}.`},
    ];
});

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
    console.log("DM from non-user");
    message.reply("I'm sorry, I can only respond to my creator.");
    return;
  }

  // we didn't ask for the guild intent so idk what else could be here...
  if (message.channel.type !== ChannelType.DM) {
    return;
  }

  switch (message.content) {
    case "!reset": {
      console.log(`!reset command from user`);
      messageManager.reset();
      message.reply("Message history reset");
      break;
    }
    case "!sentence":
      console.log(`!sentence command from user`);
      let vocabList = await getVocabList();
      let activelyLearning = [
        ...vocabList.apprentice_i,
        ...vocabList.apprentice_ii,
      ];
      // pick a random word from the list
      let word = activelyLearning[Math.floor(Math.random() * activelyLearning.length)];
      
      messageManager.softReset();
      await messageManager.recordSystemMessage(`Create a sentence to practice the word "${word}", which the student is actively learning. Use grammar constructs up to their chapter in Genki`);
      await messageManager.recordSystemMessage('Do not include translations or special formatting.');
      break;
    case "!story":
      messageManager.softReset();
      await messageManager.recordSystemMessage('Create a story using the words the student is learning, so they can practice reading. Use grammar constructs up to their chapter in Genki');
      break;
    default:
      console.log(`DM from user: ${message.content}`);
      await messageManager.recordUserMessage(message.content);
      break;
  }

  const respond = async () => {
    let messages = await messageManager.getMessages();
    const completion = await openai.chat.completions.create({
      model,
      messages,
    });
    let assistantResponse = completion.choices[0].message.content;
    await messageManager.recordAssistantMessage(assistantResponse);
    return assistantResponse;
  };

  const sendTyping = async () => {
    await message.channel.sendTyping();
  };
  
  const assistantResponse = await loopWhile(respond(), sendTyping, 9000);
  console.log(await messageManager.getMessages());
  message.channel.send(assistantResponse)
});

await client.login(process.env.DISCORD_BOT_TOKEN);

console.log("bot started");
