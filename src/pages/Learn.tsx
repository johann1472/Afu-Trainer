import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Data } from '../data';
import { asset, formulaPageFor, inTarget, shuffle, underNode } from '../data';
import type { Q } from '../types';
import { getState, recordAnswer } from '../store';
import { useMedia } from '../router';
import { QuestionCard } from '../components/QuestionCard';
import { FormulaViewer } from '../components/FormulaViewer';
import { Figure } from '../components/Zoom';

function selectQuestions(data: Data, p: URLSearchParams): { title: string; qs: Q[]; ordered?: boolean } {
  const { settings, progress } = getState();
  let qs = data.questions.filter((q) => inTarget(q, settings.target));
  const titles: string[] = [];
  const ids = p.get('ids');
  if (ids) {
    const list = ids.split(',').map((id) => data.byId.get(id)).filter((q): q is Q => !!q);
    return { title: list.length === 1 ? list[0].id : 'Auswahl', qs: list, ordered: true };
  }
  const node = p.get('node');
  if (node) {
    qs = qs.filter((q) => underNode(q, node));
    titles.push(data.nodes.get(node)?.title ?? node);
  }
  if (p.get('calc')) {
    qs = qs.filter((q) => q.calc);
    titles.push('Rechenfragen');
  }
  if (p.get('wrong')) {
    qs = qs.filter((q) => progress[q.id]?.lastAnswer === false);
    titles.push('Falsch beantwortete');
  }
  return { title: titles.join(' · ') || 'Alle Fragen', qs };
}

type Entry = { id: string; n: number };

export function Learn({ data, params }: { data: Data; params: URLSearchParams }) {
  const key = params.toString();
  const sel = useMemo(() => selectQuestions(data, params), [key]);
  const [queue, setQueue] = useState<Entry[]>([]);
  const [pos, setPos] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [formula, setFormula] = useState<number | undefined>();
  const wide = useMedia('(min-width: 900px) and (min-aspect-ratio: 1/1) and (min-height: 560px)');

  useEffect(() => {
    setQueue((sel.ordered ? sel.qs : shuffle(sel.qs)).map((q) => ({ id: q.id, n: 0 })));
    setPos(0);
    setChosen(null);
    setScore({ right: 0, wrong: 0 });
    setFormula(undefined);
  }, [sel]);

  const entry = queue[pos];
  const q = entry && data.byId.get(entry.id);

  const answer = (orig: number) => {
    if (chosen !== null || !q) return;
    setChosen(orig);
    const ok = orig === 0;
    recordAnswer(q.id, ok);
    setScore((s) => (ok ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 }));
    if (!ok) {
      // Falsch → in derselben Sitzung nach 3–5 Karten erneut zeigen
      const at = Math.min(queue.length, pos + 1 + 3 + Math.floor(Math.random() * 3));
      const nq = queue.slice();
      nq.splice(at, 0, { id: q.id, n: entry.n + 1 });
      setQueue(nq);
    }
  };

  const next = () => {
    setChosen(null);
    setPos((p) => p + 1);
    if (formula !== undefined && !wide) setFormula(undefined);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && chosen !== null && (e.target as HTMLElement)?.tagName !== 'SELECT') {
        e.preventDefault();
        next();
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  const openFormula = () => setFormula(q ? formulaPageFor(data.formulas, q.sectionId) ?? data.formulas.pages.findIndex((p) => p.page === 11) : undefined);

  if (!sel.qs.length)
    return (
      <div class="page">
        <h1>{sel.title}</h1>
        <p>Keine Fragen für diese Auswahl.</p>
        <a class="btn" href="#/">Zur Startseite</a>
      </div>
    );

  if (!q)
    return (
      <div class="page">
        <h1>Sitzung beendet</h1>
        <p class="big">
          {score.right} richtig · {score.wrong} falsch
        </p>
        <div class="row">
          <a class="btn" href="#/">Startseite</a>
          <button
            class="btn"
            onClick={() => {
              setQueue(shuffle(sel.qs).map((x) => ({ id: x.id, n: 0 })));
              setPos(0);
              setScore({ right: 0, wrong: 0 });
            }}
          >
            Nochmal
          </button>
        </div>
      </div>
    );

  const side = formula !== undefined ? (
    <FormulaViewer f={data.formulas} start={formula} onClose={() => setFormula(undefined)} />
  ) : wide && q.img ? (
    <Figure src={asset(q.img)} alt={`Abbildung zu ${q.id}`} />
  ) : null;

  return (
    <div class={`learn ${wide ? 'wide' : 'narrow'} ${side ? 'has-side' : ''}`}>
      <div class="learn-main">
        <div class="session-bar">
          <span class="session-title">{sel.title}</span>
          <span>
            {Math.min(pos + 1, queue.length)}/{queue.length} · <span class="ok">{score.right}✓</span> <span class="bad">{score.wrong}✗</span>
          </span>
        </div>
        <QuestionCard q={q} chosen={chosen} onChoose={answer} reveal showFigure={!wide} shuffleKey={`${pos}`} />
        <div class="actions">
          <button class="btn" onClick={openFormula}>📐 Formelsammlung</button>
          {chosen !== null && (
            <>
              <span class={chosen === 0 ? 'verdict ok' : 'verdict bad'}>{chosen === 0 ? 'Richtig!' : 'Leider falsch.'}</span>
              <button class="btn primary" onClick={next} autoFocus>Weiter ›</button>
            </>
          )}
        </div>
      </div>
      {side && <aside class={`learn-side ${!wide ? 'sheet' : ''}`}>{side}</aside>}
    </div>
  );
}
