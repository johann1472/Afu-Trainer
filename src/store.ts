import { get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import { answerCard, type Card } from './lib/leitner';
import type { Target } from './data';

export type Settings = { target: Target; newPerDay: number; calcStrict: boolean };
export type State = { settings: Settings; progress: Record<string, Card>; lastBackup: number | null };

const defaults: State = {
  settings: { target: 'A', newPerDay: 20, calcStrict: false },
  progress: {},
  lastBackup: null,
};

let state: State = defaults;
const listeners = new Set<() => void>();

export async function initStore() {
  try {
    const [settings, progress, lastBackup] = await Promise.all([get('settings'), get('progress'), get('lastBackup')]);
    state = {
      settings: { ...defaults.settings, ...(settings ?? {}) },
      progress: progress ?? {},
      lastBackup: lastBackup ?? null,
    };
  } catch (e) {
    console.error('IndexedDB nicht verfügbar', e);
  }
  navigator.storage?.persist?.().catch(() => {});
}

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  for (const k of Object.keys(next) as (keyof State)[]) set(k, state[k]).catch((e) => console.error(e));
}

export const getState = () => state;

export function useStore(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

export const setSettings = (s: Partial<Settings>) => update({ settings: { ...state.settings, ...s } });

export function recordAnswer(id: string, correct: boolean) {
  update({ progress: { ...state.progress, [id]: answerCard(state.progress[id], correct) } });
}
