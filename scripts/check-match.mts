// Run: node scripts/check-match.mts
import { score, words } from '../src/match.ts';

const check = (ok: boolean, what: string) => {
  if (!ok) throw new Error(`FAIL: ${what}`);
};
const v = words('For God so loved the world, that he gave his only born Son,');

check(score(v, words('for god so loved the world that he gave his only born son')).passed, 'exact read passes');
check(!score(v, words('for god so loved the world')).passed, 'half a verse fails');
check(score(v, words('for god so loved the world')).pos === 6, 'progress stops at "world"');
check(score(v, words('um for god so loved uh the world that he gay his only boring son')).passed, '2 misheard words + filler still pass');
check(!score(v, words('the the the son son god')).passed, 'word salad fails');
check(!score([], words('anything')).passed, 'empty verse never passes');
check(words('doesn’t go—out, “Amen!”').join() === 'doesnt,go,out,amen', 'normalizes quotes and dashes');
console.log('match ok');
