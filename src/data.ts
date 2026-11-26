import type { Q, TreeNode } from './types';

export type FormulaPage = { file: string; page: number | null; title: string };
export type FormulaIndex = { pages: FormulaPage[]; sections: Record<string, number[]> };
export type Target = 'N' | 'E' | 'A';

export type Data = {
  questions: Q[];
  byId: Map<string, Q>;
  tree: TreeNode[];
  nodes: Map<string, TreeNode>;
  formulas: FormulaIndex;
};

export const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

async function json<T>(p: string): Promise<T> {
  const r = await fetch(asset(p));
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function loadData(): Promise<Data> {
  const [questions, tree, formulas] = await Promise.all([
    json<Q[]>('data/questions.json'),
    json<TreeNode[]>('data/tree.json'),
    json<FormulaIndex>('data/formula_index.json'),
  ]);
  const nodes = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    nodes.set(n.id, n);
    n.children?.forEach(walk);
  };
  tree.forEach(walk);
  return { questions, byId: new Map(questions.map((q) => [q.id, q])), tree, nodes, formulas };
}

const LEVEL: Record<Target, number> = { N: 1, E: 2, A: 3 };

/** Gehört die Frage zum Prüfungsumfang der Zielklasse? */
export const inTarget = (q: Q, t: Target) => q.part !== 'T' || q.cls <= LEVEL[t];

/** Fragen unterhalb eines Baumknotens (sectionId-Präfix). */
export const underNode = (q: Q, nodeId: string) =>
  nodeId === q.part.toLowerCase() || q.sectionId === nodeId || q.sectionId.startsWith(nodeId + '-');

/** Erste passende Formelsammlungsseite (Index in pages) für eine Frage. */
export function formulaPageFor(f: FormulaIndex, sectionId: string): number | undefined {
  for (let id = sectionId; id; id = id.includes('-') ? id.slice(0, id.lastIndexOf('-')) : '') {
    const pages = f.sections[id];
    if (pages?.length) return f.pages.findIndex((p) => p.page === pages[0]);
  }
  return undefined;
}

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
