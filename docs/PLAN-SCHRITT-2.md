# Plan Schritt 2 – Wiederholung, Prüfungssimulation, Statistik

Arbeitsdokument, um Schritt 2 aus [SPEC.md](../SPEC.md) ohne Vorlauf umzusetzen.
Stand: 26.11.2026, nach Schritt 1 und erster Bugfix-Runde (Vektor-Formelsammlung, Pinch-Zoom, Vollbild).

---

## 0. Ausgangslage (was schon existiert)

| Datei | Inhalt | Relevanz für Schritt 2 |
|---|---|---|
| `src/lib/leitner.ts` | `Card`-Typ, `answerCard()`, `isSolid()`, `INTERVAL_DAYS = [0,1,3,7,14,30]`, `SOLID_BOX = 4` | Grundlogik steht schon, braucht Tests und den Tagesmodus |
| `src/store.ts` | Globaler Zustand + IndexedDB (`idb-keyval`), Keys `settings`, `progress`, `lastBackup`; `useStore()`, `recordAnswer()`, `setSettings()` | um `exams`, `examCurrent`, `daily` erweitern |
| `src/data.ts` | `loadData()`, `inTarget(q, target)`, `underNode(q, nodeId)`, `formulaPageFor()`, `shuffle()` | Pools für die Prüfung bauen |
| `src/stats.ts` | `count(qs, progress, settings)` → `{total, seen, solid}` | um „in Arbeit“, Fehlerquote, fällig erweitern |
| `src/pages/Learn.tsx` | Lernsitzung; Quellen per Hash-Parameter `node`, `calc`, `wrong`, `ids`; falsche Antworten kommen nach 3–5 Karten wieder | `review=1` (tägliche Wiederholung) ergänzen |
| `src/components/QuestionCard.tsx` | Fragekarte; mischt die Antworten **intern** per `useMemo([q.id, shuffleKey])` | für die Prüfung eine feste Reihenfolge als Prop (`order`) durchreichen |
| `src/components/FormulaViewer.tsx` | Formelsammlung mit Zoom | in der Prüfung als Seitenpanel/Sheet wiederverwenden |
| `src/pages/Placeholder.tsx` | Platzhalter für `#/exam`, `#/stats` | wird ersetzt |
| `src/App.tsx` | Hash-Router-Switch, Navigation | neue Routen eintragen |

Datenmodell der Fragen: `src/types.ts` (`Q` mit `id`, `cls`, `part`, `sectionId`, `calc` …).
`sectionId` = Position im Baum (`t04-02`), Top-Level-Kapitel ohne Unterkapitel z. B. `b01`.

Poolgrößen (Prüfungsteile, Anzahl Blatt-Unterkapitel):

| Teil | Filter | Fragen | Unterkapitel |
|---|---|---|---|
| V | `part=V` | 204 | 20 |
| B | `part=B` | 172 | 14 |
| N | `part=T, cls=1` | 195 | 40 |
| E | `part=T, cls=2` | 463 | 45 |
| A | `part=T, cls=3` | 716 | 50 |

---

## 2a. Spaced Repetition

### Logik (`src/lib/leitner.ts`)
- `answerCard()` erfüllt die SPEC bereits: richtig → Fach + 1 (max. 5), falsch → Fach 1, `due = now + INTERVAL_DAYS[box]·Tag`.
- **Ändern:** Die Fälligkeit auf **Tagesbeginn (lokale Zeit)** runden: `due = startOfDay(now) + days·DAY`. Sonst ist eine Karte, die heute um 20 Uhr gelernt wurde, morgen erst ab 20 Uhr fällig.
- Neu: `isDue(card, now)` → `card && card.box > 0 && card.due <= now`.
- Neu: `cardState(card, calc, calcStrict)` → `'new' | 'learning' | 'solid'` (für Statistik und Dashboard).
- `calcStrict`: Bleibt wie umgesetzt eine reine Wertung in `isSolid()` (Fach ≥ 4 **und** `streak ≥ 2`). An der Fächerlogik ändert sich nichts.

### Tägliche Wiederholung (`#/learn?review=1`)
- In `selectQuestions()` (Learn.tsx): alle fälligen Karten aus dem Zielklassen-Pool und dazu bis zu `newPerDay − daily.newCount` neue Karten (`!progress[id]?.seen`).
- Neue Karten nach Baumreihenfolge auswählen (erste ungesehene je Kapitel reihum), nicht rein zufällig. Dann werden Kapitel der Reihe nach erschlossen. Danach alles mischen.
- Optionaler Parameter `node` schränkt auf die gewählten Kapitel ein (SPEC: „aus den gewählten Kapiteln“). Auswahl im UI: Checkboxen im Kapitelbaum, Button „Wiederholen mit Auswahl“. Wenn das zu aufwendig wird: zunächst nur der ganze Zielklassen-Pool.
- Store: `daily: { date: 'YYYY-MM-DD', newCount: number }`. Bei Datumswechsel zurücksetzen. In `recordAnswer()` hochzählen, wenn die Karte vorher `seen === 0` hatte.
- Dashboard: Kachel „Tägliche Wiederholung – X fällig + Y neu“ als primäre Kachel ganz oben.

### Einstellungen (Settings.tsx)
- `newPerDay` (Zahleneingabe, 0–100, Standard 20).
- Schalter `calcStrict` mit Erklärtext.

### Tests (`tests/leitner.test.ts`)
- Neue Karte richtig → Fach 1, fällig morgen 0:00.
- Folge richtig ×5 → Fach 5, Intervalle 1/3/7/14/30 Tage.
- Fach 5 richtig → bleibt 5.
- Fach 4 falsch → Fach 1, `streak` 0, `wrong` + 1.
- `isSolid`: Fach 3 → false, Fach 4 → true. Mit `calcStrict` und Rechenfrage mit `streak` 1 → false.
- `isDue`: Grenzfall `due === now` → true. Fach 0 → nie „fällig“ (zählt als neu).
- Tagesauswahl: Mischung aus fälligen und neuen Karten, `newPerDay`-Limit, Reset bei Datumswechsel. Dafür die Auswahl als reine Funktion in `src/lib/review.ts` auslagern.

---

## 2b. Prüfungssimulation

### Konfiguration `src/config/exam.ts`
```ts
export const EXAM_PARTS = [
  { id: 'V', title: 'Vorschriften', filter: (q) => q.part === 'V', minutes: 45 },
  { id: 'B', title: 'Betriebliche Kenntnisse', filter: (q) => q.part === 'B', minutes: 45 },
  { id: 'N', title: 'Technik N', filter: (q) => q.part === 'T' && q.cls === 1, minutes: 45 },
  { id: 'E', title: 'Technik E', filter: (q) => q.part === 'T' && q.cls === 2, minutes: 45 },
  { id: 'A', title: 'Technik A', filter: (q) => q.part === 'T' && q.cls === 3, minutes: 60 },
] as const;
export const QUESTIONS_PER_PART = 25;
export const PASS_MARK = 19; // Sekundärquelle, siehe SPEC
```
- Welche Teile vorausgewählt sind, hängt von der Zielklasse ab: N → V, B, N; E → + E; A → alle fünf.

### Ziehung `src/lib/exam.ts`
- `drawPart(pool, n = 25, rng = Math.random)`:
  1. Fragen nach `sectionId` gruppieren.
  2. Quote je Unterkapitel = `n · größe / gesamt`. Die ganzzahligen Anteile vergeben, die restlichen Plätze nach dem **größten Rest** verteilen, Gleichstände zufällig.
  3. In jedem Unterkapitel zufällig ziehen, die Kapitel in Baumreihenfolge lassen. Die echte Prüfung ist nach Themen sortiert, deshalb nicht mischen.
- Tests (`tests/exam.test.ts`) mit seedbarem RNG:
  - genau 25 Fragen, keine Duplikate, alle aus dem richtigen Pool;
  - Kapitelquote weicht je Unterkapitel höchstens 1 vom exakten Anteil ab;
  - jeder der 5 Pools liefert gültige Ziehungen (echte `public/data/questions.json` laden wie in `katex.test.ts`).

### Zustand (Store, persistiert, übersteht App-Kill)
```ts
type ExamRun = {
  id: string;               // Zeitstempel
  parts: {
    partId: 'V'|'B'|'N'|'E'|'A';
    qids: string[];         // 25
    order: number[][];      // Antwortpermutation je Frage (stabil!)
    answers: (number|null)[]; // gewählter Original-Index (0 = richtig)
    marked: boolean[];
    startedAt: number | null;
    endsAt: number | null;  // startedAt + minutes
    submittedAt: number | null;
  }[];
  current: number;          // Index des aktiven Teils
};
```
- IndexedDB-Key `examCurrent` (laufende Prüfung) und `exams` (Historie: `{ id, date, parts: [{partId, correct, total, passed}] }`).
- Den Store nach **jeder** Antwort schreiben (wie bei `progress`).

### UI / Routen
- `#/exam`, **Start:** Teile auswählen (Checkboxen, Vorauswahl nach Zielklasse), Button „Teil einzeln“ bzw. „Komplette Prüfung“. Läuft gerade eine Prüfung: „Fortsetzen“ oder „Abbrechen“.
- `#/exam/run`, **Durchführung:**
  - Kopfzeile: Teilname, Timer (mm:ss, aus `endsAt` berechnet, nicht hochgezählt), Button „Abgeben“.
  - `QuestionCard` mit `reveal={false}` und neuer Prop `order`. Antworten lassen sich bis zur Abgabe ändern.
  - Navigation „‹ Zurück | Markieren ★ | Weiter ›“ und ein **Übersichtsraster** 5×5 (beantwortet / offen / markiert, Tipp springt zur Frage). Auf dem Tablet quer dauerhaft sichtbar (Seitenspalte), auf dem Handy als Sheet.
  - Formelsammlung erlaubt: derselbe Button und dasselbe Seitenpanel/Sheet wie in Learn.tsx. Das Layout nach Möglichkeit als Komponente `SplitLayout` aus Learn herauslösen.
  - Tastatur: 1–4/A–D wählen, ←/→ navigieren, M markieren.
  - Zeit abgelaufen → Teil automatisch abgeben. Bei der kompletten Prüfung folgt eine Zwischenseite „Teil X abgegeben – nächster Teil starten“, der Timer startet erst mit Klick.
  - Abgeben mit offenen Fragen → Bestätigungsdialog („3 Fragen unbeantwortet“).
- `#/exam/result`, **Auswertung:** pro Teil `x/25`, bestanden ✓/✗ (≥ `PASS_MARK`), Gesamtergebnis. Darunter die Liste der falschen oder offenen Fragen mit gewählter und richtiger Antwort. Tipp öffnet `#/learn?ids=…`, Button „Alle Fehler üben“.
- Bei der Abgabe gehen alle **beantworteten** Fragen per `recordAnswer()` ins Leitner-System. Unbeantwortete zählen nicht als falsch.

### Anpassung `QuestionCard`
- Prop `order?: number[]`. Wenn gesetzt, statt intern zu mischen verwenden.
- Im Modus `reveal=false` zeigt `chosen` die Markierung `chosen` (gibt es schon), ein erneuter Tipp ändert die Wahl.
- Die Tastatursteuerung liegt global auf `window`. Prüfen, dass in der Prüfung nicht zwei Handler gleichzeitig aktiv sind.

---

## 2c. Statistik & Datensicherung

### Statistik (`#/stats`, `src/pages/Stats.tsx`)
- Pro Teil (T/B/V) und pro Zielklasse: neu / in Arbeit / gefestigt als gestapelter Balken.
- **Schwächste 5 Unterkapitel:** Fehlerquote `wrong / (correct + wrong)` über die Karten des Unterkapitels, nur Kapitel mit ≥ 5 Antworten. Mit Link „Üben“ → `#/learn?node=…`.
- Verlauf der Prüfungssimulationen: Tabelle (Datum, Teile, Punkte, bestanden). Optional eine Sparkline pro Teil.
- Dashboard: „Heute fällig“ (Zahl), Fortschritt pro Teil mit drei Zuständen statt zwei, Kurzliste der schwächsten 3 Kapitel.

### Export/Import (`src/lib/backup.ts`, UI in Settings)
```ts
type Backup = {
  app: 'afu-trainer'; format: 1; exportedAt: string;
  settings: Settings; progress: Record<string, Card>;
  exams: ExamHistory[]; daily?: Daily;
};
```
- `serialize(state)` / `parse(json)` als reine Funktionen. `parse` prüft `app`, `format` und die Typen. Unbekannte Frage-IDs werden verworfen und gezählt.
- Export: `Blob` → `<a download="afu-trainer-YYYY-MM-DD.json">`. Danach `lastBackup = now`.
  Auf Android landet die Datei im Download-Ordner. Zusätzlich `navigator.share({ files })` anbieten, wenn verfügbar (z. B. Teilen an Google Drive oder an das andere Gerät).
- Import: `<input type="file" accept="application/json">` → Vorschau („1234 Karten, 5 Prüfungen, exportiert am …“) → Bestätigen → **ersetzt** den Stand. Kein Zusammenführen, das bleibt einfach. Optional später „neueren Stand je Karte behalten“ für die Synchronisation 14T ↔ Pad 7.
- Hinweis auf dem Dashboard, wenn `lastBackup` fehlt oder älter als 14 Tage ist **und** Fortschritt existiert. Der Hinweis verlinkt auf den Export.
- Test (`tests/backup.test.ts`): `parse(serialize(s))` ergibt `s` (deep equal); kaputte oder fremde Dateien werfen eine verständliche Fehlermeldung.

---

## Reihenfolge der Umsetzung (ein Durchgang)
1. `leitner.ts`-Anpassungen + `review.ts` + Tests → Tagesmodus in Learn + Dashboard-Kachel + Settings.
2. `config/exam.ts`, `lib/exam.ts` + Tests → Store-Erweiterung → `QuestionCard.order` → Exam-Seiten.
3. `stats.ts` erweitern → Stats-Seite → Dashboard-Ergänzungen.
4. `backup.ts` + Test → Export/Import-UI + Backup-Hinweis.
5. `npm run build && npm test`, Playwright-Screenshots (siehe unten) für Tablet quer, Tablet hoch, Handy und Dark Mode; Prüfung einmal komplett durchklicken; dann commit und push auf `main`.

## Abnahme (aus SPEC)
- [ ] Leitner-Logik per Unit-Tests abgedeckt (Fälligkeit, Fachwechsel)
- [ ] Prüfungssimulation mit korrekten Pools und Zeiten, 25 Fragen je Teil, Bestehen ab 19
- [ ] Export → Import ergibt identischen Stand (Test + manuell)
- [ ] Laufende Prüfung übersteht Neuladen und App-Kill
- [ ] Deploy grün, offline weiterhin funktionsfähig

## Offene Fragen an Johann (vor Beginn kurz klären)
- Reihenfolge der Teile in der kompletten Simulation: wie in der echten Prüfung? Die SPEC-Tabelle nennt V, B, N, E, A. Annahme: diese Reihenfolge.
- Import: einfach ersetzen genügt? Oder gleich das Zusammenführen für 14T ↔ Pad 7?

---

## Umgebung / Arbeitsnotizen (Termux + proot)
- Repo: `/workspace/Afu-Trainer` (= `~/Afu-Trainer` im Termux-Home). Commits direkt auf `main`, Push löst Deploy aus. Live: https://johann1472.github.io/Afu-Trainer/
- `gh` braucht `export GH_CONFIG_DIR=/data/data/com.termux/files/home/.config/gh`.
- Node ist der Termux-Build (android-arm64): **TypeScript bleibt auf 5.x** (TS 7 hat kein Android-Binary).
- `npm run build` = build-data + `tsc --noEmit` + `vite build`; `npm test` = Vitest (jsdom).
- Vorschau: `npx vite preview --port 4173` im Hintergrund starten. **Nicht** `pkill -f "vite preview"` im selben Befehl verwenden, das beendet die eigene Shell.
- E2E/Screenshots: Playwright **Firefox** in einer venv (`python3 -m venv …; pip install playwright; playwright install firefox`). Chromium stürzt in proot ab. Touch-Gesten lassen sich mit synthetischen `TouchEvent`s per `page.evaluate` testen.
- Einzelne Fragen direkt öffnen: `#/learn?ids=AG428,EB316`.
- Service Worker: Precache nur App, Daten und Formelsammlung. Die Katalogbilder lädt `src/offline.ts` nach (Runtime-Cache `katalog-bilder`).
