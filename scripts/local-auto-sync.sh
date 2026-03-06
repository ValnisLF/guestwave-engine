#!/usr/bin/env bash

set -u -o pipefail

AUTO_SYNC_URL="${AUTO_SYNC_URL:-http://localhost:3000/api/internal/ical/auto-sync}"
AUTO_SYNC_INTERVAL_SECONDS="${AUTO_SYNC_INTERVAL_SECONDS:-300}"
AUTO_SYNC_METHOD="${AUTO_SYNC_METHOD:-POST}"
ICAL_AUTO_SYNC_TOKEN="${ICAL_AUTO_SYNC_TOKEN:-}"

if ! [[ "$AUTO_SYNC_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [ "$AUTO_SYNC_INTERVAL_SECONDS" -le 0 ]; then
  echo "AUTO_SYNC_INTERVAL_SECONDS must be a positive integer (seconds)." >&2
  exit 1
fi

echo "Starting local auto-sync loop"
echo "- URL: $AUTO_SYNC_URL"
echo "- Method: $AUTO_SYNC_METHOD"
echo "- Interval: ${AUTO_SYNC_INTERVAL_SECONDS}s"
if [ -n "$ICAL_AUTO_SYNC_TOKEN" ]; then
  echo "- Auth header: x-ical-auto-sync-token (configured)"
else
  echo "- Auth header: none"
fi

echo "Press Ctrl+C to stop."

trap 'echo; echo "Auto-sync loop stopped."; exit 0' INT TERM

while true; do
  ts="$(date '+%Y-%m-%d %H:%M:%S')"

  if [ -n "$ICAL_AUTO_SYNC_TOKEN" ]; then
    if response=$(curl -sS -X "$AUTO_SYNC_METHOD" "$AUTO_SYNC_URL" -H "x-ical-auto-sync-token: $ICAL_AUTO_SYNC_TOKEN"); then
      echo "[$ts] OK: $response"
    else
      echo "[$ts] ERROR: request failed" >&2
    fi
  else
    if response=$(curl -sS -X "$AUTO_SYNC_METHOD" "$AUTO_SYNC_URL"); then
      echo "[$ts] OK: $response"
    else
      echo "[$ts] ERROR: request failed" >&2
    fi
  fi

  sleep "$AUTO_SYNC_INTERVAL_SECONDS"
done
