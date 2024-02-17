// load .env, then .env.dev, then .env.local
import { config } from 'dotenv';
import { getVocabList } from "./get_wk_data.js";
import OpenAI from 'openai';

config({ path: '.env.local' });
config({ path: '.env.dev' });
config({ path: '.env' });

const openai = new OpenAI(process.env.OPENAI_API_KEY);

console.log("fetching wanikani...");
const vocabList = await getVocabList();

const known = [
  ...vocabList.guru_i,
  ...vocabList.guru_ii,
  ...vocabList.master,
  ...vocabList.enlightened,
  ...vocabList.burned,
]

const learning = [
  ...vocabList.apprentice_i,
  ...vocabList.apprentice_ii,
  ...vocabList.apprentice_iii,
  ...vocabList.apprentice_iv,
]

const genkiLevel = 4;

console.log("generating story...");

const completion = await openai.chat.completions.create({
  model: "gpt-4-0125-preview",
  messages: [
    { role: "system", content: "You are a japanese instructor, and the student is an english speaker with some simple japanese grammar." },
    { role: "system", content: "The following is a list of words the student already knows: " + JSON.stringify(known) },
    { role: "system", content: "The following is a list of words the student is learning: " + JSON.stringify(learning) },
    { role: "system", content: "Do not use any words the student does not know or is not learning."},
    { role: "system", content: "The student is learning kanji, and you should not replace any kanji with hiragana."},
    { role: "system", content: `The student is learning grammar from the Genki I textbook. they are currently on chapter ${genkiLevel}.`},
    { role: "system", content: "Create a story for the student to practice their reading." },
  ],
})

console.log(completion.choices[0].message.content);
