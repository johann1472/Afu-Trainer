import type { Q } from './types';
import type { Card } from './lib/leitner';
import { isSolid } from './lib/leitner';
import type { Settings } from './store';

export type Counts = { total: number; seen: number; solid: number };

export function count(qs: Q[], progress: Record<string, Card>, s: Settings): Counts {
  let seen = 0;
  let solid = 0;
  for (const q of qs) {
    const c = progress[q.id];
    if (c?.seen) seen++;
    if (isSolid(c, q.calc, s.calcStrict)) solid++;
  }
  return { total: qs.length, seen, solid };
}
