#!/usr/bin/env bash
# Rendert die Seiten der Formelsammlung (Hilfsmittel-PDF) als WebP nach public/formulas/pNN.webp.
# Benötigt poppler-utils (pdftoppm) und webp (cwebp). Ergebnis wird committet.
set -euo pipefail
cd "$(dirname "$0")/.."
PDF=data/raw/Hilfsmittel_12062024.pdf
OUT=public/formulas
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
pdftoppm -r 150 -png "$PDF" "$TMP/p"
for f in "$TMP"/p-*.png; do
  n=$(basename "$f" .png); n=${n#p-}; n=$((10#$n))
  cwebp -quiet -q 80 "$f" -o "$(printf '%s/p%02d.webp' "$OUT" "$n")"
done
ls "$OUT" | wc -l
