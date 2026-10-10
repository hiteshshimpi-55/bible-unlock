/** Lowercase word tokens with punctuation dropped: "doesn’t go—out" → ["doesnt", "go", "out"]. */
export const words = (s: string) =>
  s.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);

/**
 * How much of the verse the speaker has read: longest common subsequence of verse and spoken words,
 * so misheard or skipped words don't derail it. `pos` = verse words up to the last one matched.
 * ponytail: exact word match; add edit-distance-1 matching if names fail too often
 */
export function score(verse: string[], spoken: string[]) {
  let prev = new Array<number>(spoken.length + 1).fill(0);
  let best = 0;
  let pos = 0;
  for (let i = 1; i <= verse.length; i++) {
    const cur = [0];
    for (let j = 1; j <= spoken.length; j++)
      cur[j] = verse[i - 1] === spoken[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    if (cur[spoken.length] > best) [best, pos] = [cur[spoken.length], i];
    prev = cur;
  }
  return { pos, passed: verse.length > 0 && best >= Math.ceil(verse.length * 0.8) };
}
