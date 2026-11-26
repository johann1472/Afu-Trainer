# Afu-Trainer – Spezifikation für Claude Code

Lern-App für die Amateurfunkprüfung Klasse A (BNetzA-Fragenkatalog, 3. Auflage, März 2024).
Zielplattform: **PWA** (installierbar auf Android), gehostet über **GitHub Pages**.
Arbeitsweise: **3 große Implementierungsschritte**, danach 1–2 Bugfix-Runden. Keine Mikro-Schritte.

---

## 0. Ausgangsdaten (liegen im Repo unter `data/raw/`)

| Datei | Inhalt |
|---|---|
| `fragenkatalog3b.json` | 1750 Fragen, verschachtelte `sections` → `questions` |
| `svgs/` | 687 SVG + 11 PNG (Bildnamen im JSON **ohne Endung**, z. B. `"AB109_q"` → Endung per Dateisystem auflösen) |
| `README.txt` | Lizenz DL-DE->BY-2.0 |
| `Hilfsmittel_12062024.pdf` | 24 Seiten: Auszug AFuV, Bandplan, Formelsammlung, Tabellen, Kabeldämpfungsdiagramm |

### Fakten zum JSON (bereits geprüft)
- Fragefelder: `number`, `class` (`"1"`=N, `"2"`=E, `"3"`=A), `question`, `answer_a` … `answer_d`, optional `picture_question`, `picture_a` … `picture_d`.
- **`answer_a` ist immer die richtige Antwort** → Antworten bei jeder Anzeige mischen.
- 3 Top-Level-Teile: Technische Kenntnisse (N 195 / E 463 / A 716), Betriebliche Kenntnisse (172, alle Klasse 1), Kenntnisse von Vorschriften (204, alle Klasse 1).
- Fragennummer: 1. Buchstabe = Klasse/Teil (`N`, `E`, `A` = Technik; `B` = Betrieb; `V` = Vorschriften), 2. Buchstabe = Kapitel.
- LaTeX nur inline mit `$…$` (kein `$$`), in Fragen **und** Antworten (91 Fragen mit LaTeX in Antworten). 45 Texte enthalten `\n`.
- Nicht-Standard-Makros, die KaTeX-Macros brauchen: `\milliOhm` → `\mathrm{m\Omega}`, `\mOhm` → `\mathrm{m\Omega}`, `\kiloOhm` → `\mathrm{k\Omega}`, `\glqq` → `„` (und vorsorglich `\grqq` → `“`). Nach dem Build alle Fragen durch KaTeX rendern und Fehler loggen (siehe Schritt 1).
- 77 Fragen haben leere Antworttexte → die Antworten sind reine Bilder (`picture_a`…`d`).

### Formelsammlung (PDF)
Die Textebene ist auf den meisten Seiten **kaputt kodiert** (Font-Mapping), `pdftotext` liefert Müll. Deshalb:
- Seiten beim Build als Bilder rendern (`pdftoppm -r 150` → WebP), App zeigt sie als zoombaren Seiten-Viewer.
- Eine manuell gepflegte Datei `data/formula_index.json` ordnet Katalog-Unterkapitel den Seiten der Formelsammlung zu (z. B. „Spule“ → S. 13). Claude Code erstellt diese Zuordnung, indem es die gerenderten Seiten **ansieht**.

### Lizenzpflicht
Im App-Footer und auf einer „Über“-Seite muss stehen:
> Prüfungsfragen zum Erwerb von Amateurfunkprüfungsbescheinigungen, Bundesnetzagentur, 3. Auflage, März 2024, (www.bundesnetzagentur.de/amateurfunk), Datenlizenz Deutschland – Namensnennung – Version 2.0 (www.govdata.de/dl-de/by-2-0). Die Daten wurden verändert (Antwortreihenfolge, ergänzte Erklärungen).

---

## Tech-Stack
- Vite + TypeScript, **Preact** (klein, reicht), CSS ohne Framework (oder Pico/eigenes Minimal-CSS).
- **KaTeX** (`renderMathInElement` mit `$`-Delimitern + Macros oben).
- Speicherung: **IndexedDB** (über `idb-keyval`), kein Backend.
- PWA: `vite-plugin-pwa`, komplett offlinefähig (alle Daten und SVGs precachen, ~3–4 MB).
- Build-Skript für die Daten: Node/TS (`scripts/build-data.ts`), läuft vor `vite build`.
- Deployment: GitHub Actions → GitHub Pages (`base` in Vite korrekt setzen).
- Primärgerät ist ein **Android-Tablet** (Hoch- und Querformat): im Querformat Fragekarte links und Bild/Formelsammlung rechts nebeneinander; auf schmalen Displays untereinander. Dark Mode nach Systemeinstellung, große Touch-Ziele.

---

## Schritt 1 – Datenpipeline, Grundgerüst, Lernmodus

### 1a. `scripts/build-data.ts`
Erzeugt `public/data/questions.json` (flach) und `public/data/tree.json`:
```ts
type Q = {
  id: string;            // "EB316"
  cls: 1 | 2 | 3;
  part: "T" | "B" | "V";
  path: string[];        // Kapitelpfad ohne Top-Level-Teil
  sectionId: string;     // stabiler Slug des Unterkapitels
  q: string; a: [string, string, string, string];   // a[0] = richtig
  img?: string;          // "svgs/EB316_q.svg"
  aImg?: [string?, string?, string?, string?];
  calc: boolean;         // Heuristik, s. u.
};
```
- Bildpfade mit tatsächlicher Endung auflösen; fehlende Datei = Build-Fehler.
- `calc`-Heuristik: alle vier Antworten enthalten eine Ziffer UND Frage oder Antworten enthalten Einheit/LaTeX. Grob, liefert ~560 Kandidaten. Danach manuell über `data/calc_overrides.json` korrigierbar (`{ "BA101": false }`), weil z. B. Buchstabieralphabet und Bandplan-Fragen fälschlich anschlagen.
- **Render-Check**: Testskript (Vitest, jsdom), das jede Frage/Antwort durch KaTeX rendert (`throwOnError: true`) und alle Fehler mit Fragennummer ausgibt. Muss am Ende von Schritt 1 fehlerfrei durchlaufen.
- Formelsammlung: `scripts/render-formulas.sh` (pdftoppm → WebP nach `public/formulas/p01.webp` …). In der Action `poppler-utils` installieren **oder** die Bilder einmalig lokal erzeugen und committen (bevorzugt: committen, spart Build-Zeit).

### 1b. App-Gerüst
- Routen: Start (Dashboard), Kapitelbaum, Lernsitzung, Prüfungssimulation, Formelsammlung, Statistik, Einstellungen/Über.
- Einstellungen: Zielklasse (Standard **A** = alle Technikfragen Klasse 1–3 + Betrieb + Vorschriften).

### 1c. Lernmodus
- Kapitelbaum mit Fortschrittsbalken pro Knoten (Anteil „gefestigt“, s. Schritt 2) und Fragenzahl.
- Sitzung starten aus: einem Kapitel/Unterkapitel, „nur Rechenfragen“ (`calc`), „nur Teil B/V“, „falsch beantwortete“.
- Fragekarte: Nummer, Kapitelpfad, Frage (KaTeX), Fragebild (SVG, zoombar per Tap → Vollbild), 4 gemischte Antworten (Text und/oder Bild).
- Nach Antwort: richtig/falsch farbig markieren, Button „Formelsammlung“ (öffnet passende Seite laut `formula_index.json`), ggf. Erklärung (Schritt 3), „Weiter“.
- Tastatur: 1–4 / A–D zum Antworten, Leertaste = weiter (für Desktop).

**Abnahme Schritt 1:** Build in Actions grün, Seite auf GitHub Pages erreichbar, alle 1750 Fragen ohne KaTeX-Fehler, Bilder laden, Lernmodus pro Kapitel funktioniert offline.

---

## Schritt 2 – Wiederholungssystem, Prüfungssimulation, Statistik

### 2a. Spaced Repetition (Leitner, 5 Fächer)
- Pro Frage: `{ box: 0–5, due: timestamp, seen, correct, wrong, lastAnswer }`.
- Richtig → box+1, Intervalle: 0 = neu, 1 = 1 Tag, 2 = 3 Tage, 3 = 7 Tage, 4 = 14 Tage, 5 = 30 Tage („gefestigt“ ab Fach 4). Falsch → zurück in Fach 1, in derselben Sitzung nach 3–5 Karten erneut zeigen.
- Modus „Tägliche Wiederholung“: alle fälligen Karten + bis zu N neue (einstellbar, Standard 20), gemischt aus den gewählten Kapiteln.
- Option „Rechenfragen zählen erst als gefestigt, wenn sie 2× hintereinander richtig waren“ (gegen Raten).

### 2b. Prüfungssimulation (Format seit 24.06.2024)
Fünf Teile mit je **25 Fragen**:
| Teil | Pool | Zeit |
|---|---|---|
| Vorschriften | `part=V` | 45 min |
| Betriebliche Kenntnisse | `part=B` | 45 min |
| Technik N | `part=T, cls=1` | 45 min |
| Technik E | `part=T, cls=2` | 45 min |
| Technik A | `part=T, cls=3` | 60 min |

- Bestehensgrenze pro Teil: **19 von 25** richtig (konfigurierbar in `src/config/exam.ts`, weil aus Sekundärquelle übernommen).
- Teile einzeln oder komplett simulierbar. Fragen pro Teil zufällig, aber gleichmäßig über die Kapitel verteilt (proportional zur Kapitelgröße).
- Während der Prüfung kein Feedback, Fragen überspringen/markieren, Übersichtsraster, Formelsammlung erlaubt (wie in der echten Prüfung), Timer.
- Auswertung: Punkte pro Teil, bestanden/nicht bestanden, Liste der Fehler mit Lösung. Antworten fließen ins Leitner-System ein.

### 2c. Statistik & Datensicherung
- Dashboard: fällige Karten heute, Fortschritt pro Teil (neu / in Arbeit / gefestigt), schwächste 5 Unterkapitel (Fehlerquote), Verlauf der Prüfungssimulationen.
- **Export/Import** des Lernstands als JSON-Datei (PWA-Speicher kann auf Android verloren gehen). Hinweis auf dem Dashboard, wenn das letzte Backup > 14 Tage alt ist.

**Abnahme Schritt 2:** Leitner-Logik per Unit-Tests abgedeckt (Fälligkeit, Box-Wechsel), Prüfungssimulation mit korrekten Pools/Zeiten, Export → Import ergibt identischen Stand.

---

## Schritt 3 – Erklärungen und Themen-Lernseiten (Inhalt)

### 3a. Erklärungen zu Rechenfragen
Datei `data/explanations.json`: `{ "EB316": { "steps": "…LaTeX/Markdown…", "formula": "c = \\lambda \\cdot f", "formulaPage": 11, "verified": true } }`

Vorgehen für Claude Code (kapitelweise, beginnend mit den Kapiteln mit den meisten `calc`-Fragen):
1. Für jede Rechenfrage den Rechenweg **als ausführbares Python/TS** formulieren und das Ergebnis berechnen.
2. Ergebnis gegen `answer_a` prüfen (Toleranz für Rundung, z. B. ±3 % bzw. „in etwa“-Fragen ±10 %).
3. Nur bei Übereinstimmung `verified: true` setzen; sonst in `data/explanations_review.md` mit Begründung auflisten. **Keine Erklärung erfinden, die zu einer anderen Antwort führt.**
4. Erklärungstext: kurz, Schritt-für-Schritt, Formel wie in der Formelsammlung (gleiche Formelzeichen), Einheiten in jedem Schritt, am Ende ein Satz „Typische Falle:“ falls ein Distraktor einen typischen Fehler abbildet (Faktor 2π vergessen, dB mit 10 statt 20, Effektiv- vs. Spitzenwert …).

Für Verständnisfragen ohne Rechnung (Technik, nicht `calc`) optional eine Ein-Satz-Begründung – niedrigere Priorität.
Für Teil B und V **keine** Erklärungen (reines Auswendiglernen); stattdessen bei V-Fragen optional Verweis auf Paragraf (AFuG/AFuV), wenn eindeutig.

### 3b. Themen-Lernseiten
Für die mathematisch-physikalischen Unterkapitel je eine kurze Lernseite (Markdown + KaTeX, `content/topics/<sectionId>.md`), erreichbar aus dem Kapitelbaum („Erst lernen, dann üben“):
- Kernaussage, benötigte Formeln (Verweis auf Formelsammlungsseite), 1–2 durchgerechnete Beispiele **mit anderen Zahlen als im Katalog**, Merksätze.
- Prioritätenliste (nach Anzahl Rechenfragen):
  1. Größen und Einheiten, Vorsätze, dB-Rechnung (dB, dBm, dBW, dBi/dBd)
  2. Reihen-/Parallelschaltung R, L, C
  3. Leistung, Ohmsches Gesetz, Strom-/Spannungsquellen (Innenwiderstand)
  4. Sinusförmige Signale (Effektivwert, Spitze, Periode), Wellenlänge/Frequenz
  5. Antennenmerkmale, EIRP/ERP, Übertragungsleitungen (Z, Verkürzungsfaktor, Dämpfung mit Kabeldiagramm)
  6. Anpassung, SWR, Reflexionsfaktor
  7. Schwingkreise und Filter (Resonanz, Güte, Bandbreite)
  8. Widerstand, Kondensator, Spule, Transformator (Übersetzungsverhältnis)
  9. Verstärker, Dämpfungsglieder, Netzteile
  10. Personenschutz / Sicherheitsabstand (BEMFV)
  11. Binäres Zahlensystem

### 3c. Rechen-Drill (optional, falls Zeit)
Parametrisierte Übungsaufgaben für die Top-5-Themen (zufällige Werte, eigener Lösungsweg), getrennt vom offiziellen Katalog und klar als „Zusatzübung“ gekennzeichnet.

**Abnahme Schritt 3:** Alle Erklärungen mit `verified: true` sind per Skript gegengerechnet; Review-Liste vorhanden; Lernseiten für Priorität 1–6 fertig.

---

## Bugfix-Runden
Nach Schritt 3 auf echtem Gerät (Android-Tablet, Chrome, als PWA installiert, Hoch- und Querformat) testen:
- SVG-Darstellung im Dark Mode (SVGs haben oft schwarze Linien ohne Hintergrund → weißen Hintergrund für Bilder erzwingen).
- KaTeX-Umbrüche bei langen Formeln auf schmalen Displays (horizontal scrollbar machen).
- Offline-Start nach App-Update (Service-Worker-Update-Prompt).
- Speicherverhalten nach Schließen/Neustart.

## Nicht im Umfang
Accounts, Sync, Backend, Morsetraining, Audio.
