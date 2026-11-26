import { setSettings, useStore } from '../store';
import type { Target } from '../data';
import { LICENSE } from '../config/license';

const TARGETS: [Target, string][] = [
  ['N', 'Klasse N – Technik N + Betrieb + Vorschriften'],
  ['E', 'Klasse E – Technik N, E + Betrieb + Vorschriften'],
  ['A', 'Klasse A – alle Fragen'],
];

export function Settings() {
  const { settings } = useStore();
  return (
    <div class="page">
      <h1>Einstellungen</h1>
      <section class="panel">
        <h2>Zielklasse</h2>
        {TARGETS.map(([t, label]) => (
          <label class="radio" key={t}>
            <input type="radio" name="target" checked={settings.target === t} onChange={() => setSettings({ target: t })} />
            {label}
          </label>
        ))}
      </section>
      <section class="panel">
        <h2>Über</h2>
        <p>
          Afu-Trainer ist eine offline nutzbare Lern-App für die deutsche Amateurfunkprüfung. Der Lernstand wird nur auf diesem Gerät
          gespeichert.
        </p>
        <p class="license">{LICENSE}</p>
        <p>
          Hilfsmittel/Formelsammlung: Bundesnetzagentur, Stand 12.06.2024.
        </p>
        <p><small>Version {__APP_VERSION__}</small></p>
      </section>
    </div>
  );
}
