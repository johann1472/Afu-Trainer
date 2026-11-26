import { useEffect, useState } from 'preact/hooks';
import { loadData, type Data } from './data';
import { useRoute } from './router';
import { Dashboard } from './pages/Dashboard';
import { Tree } from './pages/Tree';
import { Learn } from './pages/Learn';
import { Formulas } from './pages/Formulas';
import { Settings } from './pages/Settings';
import { Placeholder } from './pages/Placeholder';
import { UpdatePrompt } from './components/UpdatePrompt';
import { warmImages } from './offline';

const NAV = [
  ['/', 'Start', '🏠'],
  ['/tree', 'Kapitel', '📚'],
  ['/exam', 'Prüfung', '📝'],
  ['/formulas', 'Formeln', '📐'],
  ['/stats', 'Statistik', '📊'],
  ['/settings', 'Mehr', '⚙️'],
] as const;

export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();
  useEffect(() => {
    loadData().then(
      (d) => {
        setData(d);
        if (import.meta.env.PROD) warmImages(d).catch((e) => console.error('Bilder-Vorladen', e));
      },
      (e) => setError(String(e)),
    );
  }, []);

  let page;
  if (error) page = <div class="page"><h1>Fehler</h1><p>{error}</p></div>;
  else if (!data) page = <div class="page"><p>Lade Fragen …</p></div>;
  else
    switch (route.path) {
      case '/tree': page = <Tree data={data} />; break;
      case '/learn': page = <Learn data={data} params={route.params} />; break;
      case '/formulas': page = <Formulas data={data} params={route.params} />; break;
      case '/exam': page = <Placeholder title="Prüfungssimulation" />; break;
      case '/stats': page = <Placeholder title="Statistik" />; break;
      case '/settings': page = <Settings />; break;
      default: page = <Dashboard data={data} />;
    }

  const active = route.path === '/learn' ? '/tree' : route.path;
  return (
    <>
      <nav class="nav">
        <span class="brand">Afu-Trainer</span>
        {NAV.map(([href, label, icon]) => (
          <a href={`#${href}`} class={active === href ? 'active' : ''} key={href}>
            <span class="ico" aria-hidden="true">{icon}</span>
            <span class="lbl">{label}</span>
          </a>
        ))}
      </nav>
      <main>{page}</main>
      <footer class="footer">
        Fragen: Bundesnetzagentur, 3. Aufl. März 2024, DL-DE-BY-2.0 (verändert) · <a href="#/settings">Lizenz &amp; Über</a>
      </footer>
      <UpdatePrompt />
    </>
  );
}
