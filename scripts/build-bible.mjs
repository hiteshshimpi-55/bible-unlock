// Converts eBible.org's World English Bible VPL file (engwebp_vpl.txt, "GEN 1:1 text")
// into the app asset: one verse per line, "Genesis 1:1|text", in canonical order.
// Usage: node scripts/build-bible.mjs path/to/engwebp_vpl.txt
import { readFileSync, writeFileSync } from 'node:fs';

const BOOKS = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
  JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalm', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SOL: 'Song of Solomon', ISA: 'Isaiah', JER: 'Jeremiah',
  LAM: 'Lamentations', EZE: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOE: 'Joel', AMO: 'Amos',
  OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAH: 'Nahum', HAB: 'Habakkuk',
  ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew',
  MAR: 'Mark', LUK: 'Luke', JOH: 'John', ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians',
  '2CO': '2 Corinthians', GAL: 'Galatians', EPH: 'Ephesians', PHI: 'Philippians',
  COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy',
  '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAM: 'James',
  '1PE': '1 Peter', '2PE': '2 Peter', '1JO': '1 John', '2JO': '2 John', '3JO': '3 John',
  JUD: 'Jude', REV: 'Revelation',
};

const out = [];
for (const line of readFileSync(process.argv[2], 'utf8').split('\n')) {
  const m = line.match(/^(\w{3}) (\d+:\d+) (.*)$/);
  if (!m || !m[3].trim()) continue; // blank line or a verse WEB omits (e.g. Acts 8:37)
  const [, code, ref, text] = m;
  if (!BOOKS[code]) throw new Error(`Unknown book code ${code}`);
  if (text.includes('|')) throw new Error(`"|" in ${code} ${ref}`);
  out.push(`${BOOKS[code]} ${ref}|${text.trim()}`);
}

const dest = new URL('../modules/gate/android/src/main/assets/bible-web.txt', import.meta.url);
writeFileSync(dest, out.join('\n') + '\n');
console.log(`${out.length} verses → ${dest.pathname}`);
