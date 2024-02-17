import { access, writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import axios from "axios"

export async function getSubects() {
  let vocabSubjectCache = join(process.env.CACHE_DIR, "vocab_subjects.json");

  try {
    await access(vocabSubjectCache)

    let data = await readFile(vocabSubjectCache, "utf-8");
    return JSON.parse(data);
  } catch {
    let url = "https://api.wanikani.com/v2/subjects?types=vocabulary,kana_vocabulary";
    let headers = { Authorization: `Bearer ${process.env.WANIKANI_API_KEY}` };
    let vocab = {}
    
    while(url) {
      let result = await axios.get(url, { headers });
      url = result?.data?.pages?.next_url;

      for(let subject of result.data.data) {
        vocab[subject.id] = subject.data.characters;
      }
    }
    
    // write vocab object to cache as json
    await mkdir(process.env.CACHE_DIR, { recursive: true });
    await writeFile(vocabSubjectCache, JSON.stringify(vocab));
    return vocab;
  }
}

export async function getAssignments() {
  let vocabAssignmentCache = join(process.env.CACHE_DIR, "vocab_assignments.json");
  let url = "https://api.wanikani.com/v2/assignments?subject_types=vocabulary,kana_vocabulary&started=true";
  let headers = { Authorization: `Bearer ${process.env.WANIKANI_API_KEY}` };
  let assignments = {}
  let dataUpdatedAt = undefined;

  try {
    await access(vocabAssignmentCache)

    let data = JSON.parse(await readFile(vocabAssignmentCache, "utf-8"));
    assignments = data.assignments;
    dataUpdatedAt = data.updated_time;

    url = `${url}&updated_after=${dataUpdatedAt}`
  } catch {
  }
  while(url) {
    let result = await axios.get(url, { headers });
    url = result?.data?.pages?.next_url;
    dataUpdatedAt = result?.data?.data_updated_at ?? dataUpdatedAt;

    for(let assignment of result.data.data) {
      assignments[assignment.data.subject_id] = assignment.data.srs_stage;
    }
  }

  // write vocab object to cache as json
  await mkdir(process.env.CACHE_DIR, { recursive: true });
  if(dataUpdatedAt === undefined) {
    dataUpdatedAt = new Date().toISOString();
  }
  await writeFile(vocabAssignmentCache, JSON.stringify({
    updated_time: dataUpdatedAt,
    assignments
  }));
  return assignments;
}

/**
 * @returns {Promise<{
 *  apprentice_i: string[],
 *  apprentice_ii: string[],
 *  apprentice_iii: string[],
 *  apprentice_iv: string[],
 *  guru_i: string[],
 *  guru_ii: string[],
 *  master: string[],
 *  enlightened: string[],
 *  burned: string[],
 * }>}
 */
export async function getVocabList() {
  let subjects = await getSubects();
  let assignments = await getAssignments();

  // string -> string
  let vocab = {
    apprentice_i: [],
    apprentice_ii: [],
    apprentice_iii: [],
    apprentice_iv: [],
    guru_i: [],
    guru_ii: [],
    master: [],
    enlightened: [],
    burned: []
  }

  for(let [id, srs] of Object.entries(assignments)) {
    vocab[getSrsNameFromNumber(srs)].push(subjects[id]);
  }

  return vocab;
}

function getSrsNameFromNumber(srs) {
  switch (srs) {
    case 0:
      return "unlocked";
    case 1:
      return "apprentice_i";
    case 2:
      return "apprentice_ii";
    case 3:
      return "apprentice_iii";
    case 4:
      return "apprentice_iv";
    case 5:
      return "guru_i";
    case 6:
      return "guru_ii";
    case 7:
      return "master";
    case 8:
      return "enlightened";
    case 9:
      return "burned";
  }
}
