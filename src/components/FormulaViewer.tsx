import { useEffect, useState } from 'preact/hooks';
import { asset, type FormulaIndex } from '../data';
import { ZoomBox } from './Zoom';

const label = (p: FormulaIndex['pages'][number]) => (p.page ? `S. ${p.page} – ${p.title}` : p.title);

export function FormulaViewer({ f, start, onClose }: { f: FormulaIndex; start?: number; onClose?: () => void }) {
  const [i, setI] = useState(start ?? f.pages.findIndex((p) => p.page === 11));
  useEffect(() => {
    if (start !== undefined) setI(start);
  }, [start]);
  const p = f.pages[i];
  return (
    <div class="formula">
      <ZoomBox src={asset(`formulas/${p.file}`)} alt={label(p)}>
        <button onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Vorherige Seite">‹</button>
        <select value={i} onChange={(e) => setI(+(e.target as HTMLSelectElement).value)} aria-label="Seite">
          {f.pages.map((pg, k) => (
            <option value={k} key={pg.file}>{label(pg)}</option>
          ))}
        </select>
        <button onClick={() => setI(i + 1)} disabled={i === f.pages.length - 1} aria-label="Nächste Seite">›</button>
        {onClose && <button onClick={onClose} aria-label="Formelsammlung schließen">✕</button>}
      </ZoomBox>
    </div>
  );
}
