#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
archive="$root/source_material"
output="$root/source_manifest.md"

{
  echo "# Mandatory Source Archive Manifest"
  echo
  echo "This manifest records the preserved developer source archive used by the integrated Value Fieldbook plan. SHA-256 values establish immutable file identity; summaries and implementation mapping are maintained separately in \`source_traceability.md\`."
  echo
  echo "| Source ID | File | Lines | SHA-256 |"
  echo "| --- | --- | ---: | --- |"
  while IFS= read -r file; do
    name="$(basename "$file")"
    source_id="${name%%_*}"
    lines="$(wc -l < "$file" | tr -d ' ')"
    checksum="$(sha256sum "$file" | awk '{print $1}')"
    echo "| ${source_id} | \`source_material/${name}\` | ${lines} | \`${checksum}\` |"
  done < <(find "$archive" -maxdepth 1 -type f -name '*.txt' -print | sort -V)
} > "$output"
