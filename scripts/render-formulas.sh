#!/usr/bin/env bash
# Rendert die Seiten der Formelsammlung (Hilfsmittel-PDF) als Vektor-SVG nach public/formulas/pNN.svg
# (scharf bei jeder Zoomstufe). Benötigt poppler-utils (pdftocairo). Ergebnis wird committet.
set -euo pipefail
cd "$(dirname "$0")/.."
PDF=data/raw/Hilfsmittel_12062024.pdf
OUT=public/formulas
mkdir -p "$OUT"
rm -f "$OUT"/p*.webp "$OUT"/p*.svg
n=$(pdfinfo "$PDF" | awk '/^Pages:/ {print $2}')
for i in $(seq 1 "$n"); do
  pdftocairo -svg -f "$i" -l "$i" "$PDF" "$(printf '%s/p%02d.svg' "$OUT" "$i")"
done
npx svgo -q -f "$OUT" --multipass
ls "$OUT" | wc -l
