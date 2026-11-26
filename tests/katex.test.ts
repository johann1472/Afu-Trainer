import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderText } from '../src/lib/render';
import type { Q } from '../src/types';

const questions: Q[] = JSON.parse(readFileSync(join(import.meta.dirname, '../public/data/questions.json'), 'utf8'));

describe('KaTeX-Render-Check', () => {
  it('rendert alle 1750 Fragen und Antworten fehlerfrei', () => {
    expect(questions).toHaveLength(1750);
    const errors: string[] = [];
    for (const q of questions) {
      for (const [field, text] of [['q', q.q], ...q.a.map((a, i) => [`a${i}`, a])] as [string, string][]) {
        try {
          renderText(text, true);
        } catch (e) {
          errors.push(`${q.id} ${field}: ${(e as Error).message}`);
        }
      }
    }
    if (errors.length) console.error(errors.join('\n'));
    expect(errors).toEqual([]);
  });
});
