// Leitner-System mit 5 Fächern (0 = neu). Schritt 2 erweitert/testet das.
export type Card = {
  box: number; // 0–5
  due: number; // Zeitstempel ms
  seen: number;
  correct: number;
  wrong: number;
  lastAnswer: boolean | null;
  streak: number; // richtige Antworten in Folge
};

export const DAY = 24 * 60 * 60 * 1000;
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const SOLID_BOX = 4;

export const newCard = (): Card => ({ box: 0, due: 0, seen: 0, correct: 0, wrong: 0, lastAnswer: null, streak: 0 });

export function answerCard(card: Card | undefined, correct: boolean, now = Date.now()): Card {
  const c = { ...(card ?? newCard()) };
  c.seen++;
  c.lastAnswer = correct;
  if (correct) {
    c.correct++;
    c.streak++;
    c.box = Math.min(5, c.box + 1);
  } else {
    c.wrong++;
    c.streak = 0;
    c.box = 1;
  }
  c.due = now + INTERVAL_DAYS[c.box] * DAY;
  return c;
}

/** Gefestigt ab Fach 4; optional Rechenfragen erst nach 2× richtig in Folge. */
export function isSolid(card: Card | undefined, calc: boolean, calcStrict: boolean): boolean {
  if (!card || card.box < SOLID_BOX) return false;
  return !(calcStrict && calc && card.streak < 2);
}
