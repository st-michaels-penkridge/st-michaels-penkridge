#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DST="$DIR/ChurchYard2019.bmp"
JPG="$DIR/ChurchYard2019.jpg"

SRC=""
for vol in /Volumes/Lexar /Volumes/Lexar/* /Volumes/*; do
  [[ -d "$vol" ]] || continue
  while IFS= read -r -d '' f; do
    SRC="$f"
    break
  done < <(find "$vol" -name 'ChurchYard2019.bmp' -print -quit 2>/dev/null)
  [[ -n "$SRC" ]] && break
done

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "Could not find ChurchYard2019.bmp on any mounted volume." >&2
  echo "Plug in the Lexar stick (Church Grave finder folder) and run again." >&2
  exit 1
fi

cp "$SRC" "$DST"
sips -s format jpeg "$DST" --out "$JPG" >/dev/null
echo "Restored from: $SRC"
echo "Wrote: $JPG"
