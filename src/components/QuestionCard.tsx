import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Q } from '../types';
import { asset, shuffle } from '../data';
import { Tex } from './Tex';
import { Figure } from './Zoom';

const LETTERS = ['A', 'B', 'C', 'D'];
const CLS = ['', 'N', 'E', 'A'];

type Props = {
  q: Q;
  /** Gewählte Antwort (Index in q.a) oder null. */
  chosen: number | null;
  onChoose: (orig: number) => void;
  /** Lösung anzeigen (Lernmodus nach Antwort). */
  reveal: boolean;
  showFigure: boolean;
  /** Zufallsreihenfolge stabil halten (z. B. pro Sitzungs-Durchgang). */
  shuffleKey: string | number;
};

export function QuestionCard({ q, chosen, onChoose, reveal, showFigure, shuffleKey }: Props) {
  const order = useMemo(() => shuffle([0, 1, 2, 3]), [q.id, shuffleKey]);
  const [locked, setLocked] = useState(false);
  useEffect(() => setLocked(false), [q.id, shuffleKey]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (n >= 0 && e.key.length === 1 && !(reveal && chosen !== null)) {
        e.preventDefault();
        choose(order[n]);
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  const choose = (orig: number) => {
    if (reveal && chosen !== null) return;
    if (locked) return;
    if (reveal) setLocked(true);
    onChoose(orig);
  };

  return (
    <article class="card">
      <header class="meta">
        <span class="qid">{q.id}</span>
        <span class="badge">{q.part === 'T' ? `Klasse ${CLS[q.cls]}` : q.part === 'B' ? 'Betrieb' : 'Vorschriften'}</span>
        {q.calc && <span class="badge calc">Rechnen</span>}
        <span class="path">{q.path.join(' › ')}</span>
      </header>
      <p class="qtext"><Tex text={q.q} /></p>
      {showFigure && q.img && <Figure src={asset(q.img)} alt={`Abbildung zu ${q.id}`} />}
      <ol class="answers">
        {order.map((orig, pos) => {
          const st = !reveal || chosen === null ? (chosen === orig ? 'chosen' : '') : orig === 0 ? 'right' : chosen === orig ? 'wrong' : 'dim';
          const img = q.aImg?.[orig];
          return (
            <li key={orig}>
              <button class={`answer ${st}`} onClick={() => choose(orig)} aria-pressed={chosen === orig}>
                <span class="letter">{LETTERS[pos]}</span>
                <span class="atext">
                  {q.a[orig] && <Tex text={q.a[orig]} />}
                  {img && <img src={asset(img)} alt={`Antwort ${LETTERS[pos]}`} class="paper aimg" loading="lazy" />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
