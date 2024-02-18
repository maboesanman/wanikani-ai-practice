// load .env, then .env.dev, then .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.dev' });
config({ path: '.env' });

import OpenAI from 'openai';

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

console.log("generating story...");
const completion = await openai.chat.completions.create({
  model: "gpt-4-0125-preview",
  messages: [
    { role: "system", content: "You are a japanese instructor." },
    { role: "system", content: "The student is an english speaker learning japanese, and you should use simple words and grammar."},
    { role: "system", content: `The following is a list of words the student has learned: ${JSON.stringify(known)}` },
    { role: "system", content: `The following is a list of words the student is actively learning: ${JSON.stringify(learning)}` },
    { role: "system", content: "Do not use any words the student does not know or is not learning."},
    { role: "system", content: "The student is learning kanji, and you should not replace any kanji with hiragana."},
    { role: "system", content: `The student is learning grammar from the Genki textbook. They are currently on book ${genki.book}, chapter ${genki.chapter}.`},
    { role: "system", content: `for each of these words: ${JSON.stringify(activelyLearning)} Create a sentance to practice vocabulary the student is actively learning. Use grammar constructs up to their chapter in Genki` },
  ],
});

console.log(completion.choices[0].message.content);
