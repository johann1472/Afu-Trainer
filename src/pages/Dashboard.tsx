import type { Data } from '../data';
import { inTarget } from '../data';
import { useStore } from '../store';
import { count } from '../stats';
import { Bar } from '../components/Progress';

const PARTS = [
  ['T', 'Technik'],
  ['B', 'Betrieb'],
  ['V', 'Vorschriften'],
] as const;

export function Dashboard({ data }: { data: Data }) {
  const { settings, progress } = useStore();
  const pool = data.questions.filter((q) => inTarget(q, settings.target));
  const wrong = pool.filter((q) => progress[q.id]?.lastAnswer === false).length;
  const calc = pool.filter((q) => q.calc).length;
  const all = count(pool, progress, settings);
  return (
    <div class="page">
      <h1>Klasse {settings.target}</h1>
      <section class="panel">
        <div class="stat-row">
          <div><b>{all.total}</b><small>Fragen</small></div>
          <div><b>{all.seen}</b><small>gesehen</small></div>
          <div><b>{all.solid}</b><small>gefestigt</small></div>
        </div>
        {PARTS.map(([p, name]) => {
          const c = count(pool.filter((q) => q.part === p), progress, settings);
          return (
            <div class="part-row" key={p}>
              <span>{name}</span>
              <Bar {...c} />
              <small>{c.solid}/{c.total}</small>
            </div>
          );
        })}
      </section>
      <section class="tiles">
        <a class="tile primary" href="#/tree">📚 Nach Kapiteln lernen</a>
        <a class="tile" href="#/learn?calc=1">🧮 Nur Rechenfragen <small>{calc}</small></a>
        <a class="tile" href="#/learn?node=b">📻 Teil Betrieb</a>
        <a class="tile" href="#/learn?node=v">§ Teil Vorschriften</a>
        <a class={`tile ${wrong ? '' : 'disabled'}`} href={wrong ? '#/learn?wrong=1' : undefined}>
          ❌ Falsch beantwortete <small>{wrong}</small>
        </a>
        <a class="tile" href="#/formulas">📐 Formelsammlung</a>
      </section>
    </div>
  );
}
