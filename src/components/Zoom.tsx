import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

/** Scrollbarer Bildbereich mit Zoomstufen (Buttons, Doppeltipp). */
export function ZoomBox({ src, alt, children }: { src: string; alt: string; children?: ComponentChildren }) {
  const [z, setZ] = useState(1);
  useEffect(() => setZ(1), [src]);
  const step = (d: number) => setZ((v) => Math.min(4, Math.max(1, +(v + d).toFixed(2))));
  return (
    <div class="zoombox">
      <div class="zoombar">
        {children}
        <span class="spacer" />
        <button onClick={() => step(-0.5)} disabled={z <= 1} aria-label="Verkleinern">−</button>
        <span class="zoomval">{Math.round(z * 100)} %</span>
        <button onClick={() => step(0.5)} disabled={z >= 4} aria-label="Vergrößern">+</button>
      </div>
      <div class="zoomscroll">
        <img src={src} alt={alt} class="paper" style={{ width: `${z * 100}%` }} onDblClick={() => setZ(z > 1 ? 1 : 2)} />
      </div>
    </div>
  );
}

export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div class="overlay" role="dialog" aria-modal="true">
      <ZoomBox src={src} alt={alt}>
        <button onClick={onClose} aria-label="Schließen">✕ Schließen</button>
      </ZoomBox>
    </div>
  );
}

/** Fragebild: Tipp öffnet Vollbild. */
export function Figure({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button class="figure" onClick={() => setOpen(true)} aria-label="Bild vergrößern">
        <img src={src} alt={alt} class="paper" loading="lazy" />
      </button>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
