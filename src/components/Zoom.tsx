import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

const MAX_ZOOM = 6;
const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));

/**
 * Scrollbarer Bildbereich mit eigenem Zoom: Pinch (zwei Finger), Strg+Mausrad,
 * Doppeltipp und Buttons. Der Browser-Pinch ist hier per touch-action abgeschaltet,
 * damit nicht die ganze Seite zoomt.
 */
export function ZoomBox({ src, alt, children }: { src: string; alt: string; children?: ComponentChildren }) {
  const [z, setZ] = useState(1);
  const zr = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  /** Zoom setzen, Punkt (px, py) relativ zum Scrollbereich bleibt an seiner Stelle. */
  const apply = (target: number, px?: number, py?: number) => {
    const sc = scroller.current;
    const im = img.current;
    if (!sc || !im) return;
    const nz = clamp(target);
    const x = px ?? sc.clientWidth / 2;
    const y = py ?? sc.clientHeight / 2;
    const ratio = nz / zr.current;
    const cx = sc.scrollLeft + x;
    const cy = sc.scrollTop + y;
    im.style.width = `${nz * 100}%`;
    sc.scrollLeft = cx * ratio - x;
    sc.scrollTop = cy * ratio - y;
    zr.current = nz;
  };
  const commit = (target: number, px?: number, py?: number) => {
    apply(target, px, py);
    setZ(zr.current);
  };

  useEffect(() => {
    zr.current = 1;
    if (img.current) img.current.style.width = '100%';
    scroller.current?.scrollTo(0, 0);
    setZ(1);
  }, [src]);

  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    let pinch: { d: number; z: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => {
      const r = sc.getBoundingClientRect();
      return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top] as const;
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinch = { d: dist(e.touches), z: zr.current };
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [x, y] = mid(e.touches);
      apply((pinch.z * dist(e.touches)) / pinch.d, x, y);
    };
    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        setZ(zr.current);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = sc.getBoundingClientRect();
      commit(zr.current * Math.exp(-e.deltaY * 0.002), e.clientX - r.left, e.clientY - r.top);
    };
    sc.addEventListener('touchstart', onStart, { passive: false });
    sc.addEventListener('touchmove', onMove, { passive: false });
    sc.addEventListener('touchend', onEnd);
    sc.addEventListener('touchcancel', onEnd);
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      sc.removeEventListener('touchstart', onStart);
      sc.removeEventListener('touchmove', onMove);
      sc.removeEventListener('touchend', onEnd);
      sc.removeEventListener('touchcancel', onEnd);
      sc.removeEventListener('wheel', onWheel);
    };
  }, []);

  const onDbl = (e: MouseEvent) => {
    const r = scroller.current!.getBoundingClientRect();
    commit(zr.current > 1 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
  };

  return (
    <div class="zoombox">
      <div class="zoombar">
        {children}
        <span class="spacer" />
        <button onClick={() => commit(zr.current - 0.5)} disabled={z <= 1} aria-label="Verkleinern">−</button>
        <span class="zoomval">{Math.round(z * 100)} %</span>
        <button onClick={() => commit(zr.current + 0.5)} disabled={z >= MAX_ZOOM} aria-label="Vergrößern">+</button>
      </div>
      <div class="zoomscroll" ref={scroller}>
        <img ref={img} src={src} alt={alt} class="paper" style={{ width: `${zr.current * 100}%` }} onDblClick={onDbl} draggable={false} />
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
