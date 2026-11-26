# Afu-Trainer

Offline-fähige Lern-App (PWA) für die deutsche Amateurfunkprüfung (Klassen N, E, A) auf Basis des
BNetzA-Fragenkatalogs, 3. Auflage März 2024. Spezifikation: [SPEC.md](SPEC.md).

## Entwicklung

```sh
npm install
npm run dev        # erzeugt public/data + public/svgs, startet Vite
npm test           # KaTeX-Render-Check aller 1750 Fragen
npm run build      # Daten + Typecheck + Produktionsbuild nach dist/
```

- `scripts/build-data.ts` – Katalog (`data/raw/`) → `public/data/questions.json`, `tree.json`, Bilder nach `public/svgs/`
- `scripts/render-formulas.sh` – Formelsammlung-PDF → `public/formulas/pNN.svg` (Vektor, benötigt `pdftocairo`; Ergebnis ist committet)
- `data/calc_overrides.json` – manuelle Korrektur der Rechenfragen-Heuristik
- `data/formula_index.json` – Kapitel (`sectionId`) → Seiten der Formelsammlung (gedruckte Seitennummern)

`sectionId` ist die Position im Kapitelbaum (`t02-06` = Technik, Kapitel 2, Unterkapitel 6), weil die
Fragennummern nicht eindeutig auf Unterkapitel abbilden.

Deployment: GitHub Actions → GitHub Pages bei jedem Push auf `main`.

## Lizenz der Fragen

Prüfungsfragen zum Erwerb von Amateurfunkprüfungsbescheinigungen, Bundesnetzagentur, 3. Auflage, März 2024,
(www.bundesnetzagentur.de/amateurfunk), Datenlizenz Deutschland – Namensnennung – Version 2.0
(www.govdata.de/dl-de/by-2-0). Die Daten wurden verändert (Antwortreihenfolge, ergänzte Erklärungen).
