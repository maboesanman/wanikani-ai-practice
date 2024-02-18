
import { join } from "path";
import { readFile, writeFile } from "fs/promises";

let defaltGenki = {
  book: 1,
  chapter: 1,
}

/**
 * @returns {Promise<{
 *  book: number,
 *  chapter: number,
 * }>}
 */
export async function getGenki() {
  let genkiCache = join(process.env.CACHE_DIR, "genki.json");
  try {
    let data = await readFile(genkiCache);
    return JSON.parse(data);
  } catch (e) {
    await writeFile(genkiCache, JSON.stringify(defaltGenki));
    return defaltGenki;
  }
}

/**
 * @param {number} chapter 
 */
export async function setGenkiChapter(chapter) {
  let data = await getGenki();
  data.chapter = chapter;
  await writeFile(genkiCache, JSON.stringify(data));
}

/**
 * @param {number} book 
 */
export async function setGenkiBook(book) {
  let data = await getGenki();
  data.book = book;
  await writeFile(genkiCache, JSON.stringify(data));
}
