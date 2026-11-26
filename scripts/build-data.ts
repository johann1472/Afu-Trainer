// Erzeugt public/data/questions.json + tree.json aus data/raw/fragenkatalog3b.json
// und kopiert die Bilder nach public/svgs/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import type { Q, TreeNode, Part, Cls } from '../src/types';

const root = join(import.meta.dirname, '..');
const rawDir = join(root, 'data/raw');
const outDir = join(root, 'public/data');
const svgOut = join(root, 'public/svgs');

type RawQ = Record<string, string>;
type RawSection = { title: string; sections?: RawSection[]; questions?: RawQ[] };

const raw = JSON.parse(readFileSync(join(rawDir, 'fragenkatalog3b.json'), 'utf8')) as { sections: RawSection[] };
const overrides: Record<string, boolean> = JSON.parse(readFileSync(join(root, 'data/calc_overrides.json'), 'utf8'));

// Bildname ohne Endung -> Dateiname mit Endung
const images = new Map<string, string>();
for (const f of readdirSync(join(rawDir, 'svgs'))) images.set(parse(f).name, f);

const errors: string[] = [];
const usedImages = new Set<string>();
function img(name: string | undefined, qid: string): string | undefined {
  if (!name) return undefined;
  const f = images.get(name);
  if (!f) {
    errors.push(`${qid}: Bild ${name} fehlt`);
    return undefined;
  }
  usedImages.add(f);
  return `svgs/${f}`;
}

const PARTS: [string, Part][] = [['Technische', 'T'], ['Betriebliche', 'B'], ['Vorschriften', 'V']];

const UNIT = /(\$|\d\s*(%|[pnµumkMGT]?(V|A|W|Ω|Ohm|Hz|F|H|s|m|J)\b|dB|°)|\b(Ohm|Volt|Ampere|Watt|Hertz|dB[a-zµ]*)\b)/;
function isCalc(q: RawQ): boolean {
  const answers = [q.answer_a, q.answer_b, q.answer_c, q.answer_d];
  if (!answers.every((a) => /\d/.test(a))) return false;
  return [q.question, ...answers].some((t) => UNIT.test(t));
}

const questions: Q[] = [];
const seen = new Set<string>();

function walk(sec: RawSection, part: Part, path: string[], id: string): TreeNode {
  const node: TreeNode = { id, title: sec.title, part };
  if (sec.sections?.length) {
    node.children = sec.sections.map((s, i) => walk(s, part, [...path, s.title], `${id}-${String(i + 1).padStart(2, '0')}`));
  }
  for (const r of sec.questions ?? []) {
    const id_ = r.number;
    if (seen.has(id_)) errors.push(`${id_}: doppelt`);
    seen.add(id_);
    const cls = Number(r.class) as Cls;
    if (![1, 2, 3].includes(cls)) errors.push(`${id_}: unbekannte Klasse ${r.class}`);
    const q: Q = {
      id: id_,
      cls,
      part,
      path,
      sectionId: id,
      q: r.question,
      a: [r.answer_a, r.answer_b, r.answer_c, r.answer_d],
      calc: overrides[id_] ?? isCalc(r),
    };
    const qi = img(r.picture_question, id_);
    if (qi) q.img = qi;
    if (r.picture_a || r.picture_b || r.picture_c || r.picture_d) {
      q.aImg = (['a', 'b', 'c', 'd'] as const).map((k) => img(r[`picture_${k}`], id_)) as Q['aImg'];
    }
    q.a.forEach((a, i) => {
      if (!a && !q.aImg?.[i]) errors.push(`${id_}: Antwort ${i} weder Text noch Bild`);
    });
    questions.push(q);
  }
  return node;
}

const tree: TreeNode[] = raw.sections.map((top) => {
  const p = PARTS.find(([k]) => top.title.includes(k));
  if (!p) throw new Error(`Unbekannter Prüfungsteil: ${top.title}`);
  const part = p[1];
  const title = top.title.replace(/^.*Prüfungsteil:\s*/, '');
  const node: TreeNode = { id: part.toLowerCase(), title, part };
  node.children = (top.sections ?? []).map((s, i) => walk(s, part, [s.title], `${part.toLowerCase()}${String(i + 1).padStart(2, '0')}`));
  if (top.questions?.length) errors.push(`Fragen direkt im Top-Level ${top.title}`);
  return node;
});

for (const k of Object.keys(overrides)) if (!seen.has(k)) errors.push(`calc_overrides: unbekannte Frage ${k}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(svgOut, { recursive: true });
writeFileSync(join(outDir, 'questions.json'), JSON.stringify(questions));
writeFileSync(join(outDir, 'tree.json'), JSON.stringify(tree));
writeFileSync(join(outDir, 'formula_index.json'), readFileSync(join(root, 'data/formula_index.json')));
for (const f of usedImages) {
  const dst = join(svgOut, f);
  if (!existsSync(dst)) copyFileSync(join(rawDir, 'svgs', f), dst);
}
const calc = questions.filter((q) => q.calc).length;
console.log(`${questions.length} Fragen, ${calc} Rechenfragen, ${usedImages.size} Bilder`);
