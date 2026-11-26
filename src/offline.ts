import { useEffect, useState } from 'preact/hooks';
import { asset, type Data } from './data';

// Lädt alle Katalogbilder in den Runtime-Cache des Service Workers (CacheFirst, siehe vite.config.ts).
const CACHE = 'katalog-bilder';

export type OfflineStatus = { total: number; done: number; failed: number; running: boolean };
let status: OfflineStatus = { total: 0, done: 0, failed: 0, running: false };
const listeners = new Set<() => void>();
const emit = (s: Partial<OfflineStatus>) => {
  status = { ...status, ...s };
  listeners.forEach((l) => l());
};

export function imagePaths(data: Data): string[] {
  const s = new Set<string>();
  for (const q of data.questions) {
    if (q.img) s.add(q.img);
    q.aImg?.forEach((i) => i && s.add(i));
  }
  return [...s];
}

export async function warmImages(data: Data) {
  if (status.running || !('serviceWorker' in navigator) || !('caches' in window)) return;
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    // Erste Installation: Seite noch nicht kontrolliert, Fetches liefen am SW vorbei.
    await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
  }
  const urls = imagePaths(data).map((p) => new URL(asset(p), location.href).href);
  emit({ total: urls.length, done: 0, failed: 0, running: true });
  const cache = await caches.open(CACHE);
  const missing: string[] = [];
  for (const u of urls) (await cache.match(u)) ? emit({ done: status.done + 1 }) : missing.push(u);

  for (let attempt = 0; attempt < 3 && missing.length; attempt++) {
    const queue = missing.splice(0);
    let failed = 0;
    const worker = async () => {
      for (let u = queue.shift(); u; u = queue.shift()) {
        try {
          const r = await fetch(u);
          if (!r.ok) throw new Error(String(r.status));
          await r.arrayBuffer();
          emit({ done: status.done + 1 });
        } catch {
          missing.push(u);
          failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    emit({ failed });
    if (missing.length) await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  emit({ running: false, failed: missing.length });
}

export function useOfflineStatus(): OfflineStatus {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return status;
}
