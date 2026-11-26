import { useEffect, useState } from 'preact/hooks';
import { registerSW } from 'virtual:pwa-register';

export function UpdatePrompt() {
  const [update, setUpdate] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const u = registerSW({
      onNeedRefresh: () => setUpdate(() => u),
      onOfflineReady: () => {
        setOffline(true);
        setTimeout(() => setOffline(false), 4000);
      },
    });
  }, []);
  if (update)
    return (
      <div class="toast">
        Neue Version verfügbar.
        <button class="btn primary" onClick={() => update(true)}>Aktualisieren</button>
        <button class="btn" onClick={() => setUpdate(null)}>Später</button>
      </div>
    );
  if (offline) return <div class="toast">Offline verfügbar ✓</div>;
  return null;
}
