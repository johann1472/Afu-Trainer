import { useState } from 'preact/hooks';
import type { Data } from '../data';
import { inTarget, underNode } from '../data';
import type { TreeNode } from '../types';
import { useStore } from '../store';
import { count } from '../stats';
import { Bar } from '../components/Progress';

export function Tree({ data }: { data: Data }) {
  const { settings, progress } = useStore();
  const pool = data.questions.filter((q) => inTarget(q, settings.target));
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const n = new Set(open);
    n.has(id) ? n.delete(id) : n.add(id);
    setOpen(n);
  };

  const Node = ({ n, depth }: { n: TreeNode; depth: number }) => {
    const qs = pool.filter((q) => underNode(q, n.id));
    if (!qs.length) return null;
    const c = count(qs, progress, settings);
    const isOpen = open.has(n.id);
    return (
      <li class={`node d${depth}`}>
        <div class="node-row">
          {n.children ? (
            <button class="twisty" onClick={() => toggle(n.id)} aria-expanded={isOpen} aria-label={isOpen ? 'Zuklappen' : 'Aufklappen'}>
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span class="twisty" />
          )}
          <button class="node-title" onClick={() => (n.children ? toggle(n.id) : (location.hash = `#/learn?node=${n.id}`))}>
            {n.title}
          </button>
          <div class="node-stats">
            <Bar {...c} />
            <small>{c.solid}/{c.total}</small>
          </div>
          <a class="btn small" href={`#/learn?node=${n.id}`}>Üben</a>
        </div>
        {isOpen && n.children && (
          <ul>
            {n.children.map((ch) => <Node n={ch} depth={depth + 1} key={ch.id} />)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div class="page">
      <h1>Kapitel</h1>
      <ul class="tree">
        {data.tree.map((n) => <Node n={n} depth={0} key={n.id} />)}
      </ul>
    </div>
  );
}
