#!/usr/bin/env bash
# opencli PoC — verify the local browser bridge can drive a write action end-to-end.
# Run on a machine with Chrome + opencli extension installed.
set -euo pipefail

echo "==> [1/4] Daemon + extension health"
opencli doctor

echo ""
echo "==> [2/4] Read path — fetch own timeline (3 tweets)"
opencli twitter timeline -f json --limit 3 | jq '.[] | {id, text: (.text // .content | .[0:80])}' || true

echo ""
echo "==> [3/4] Read path — fetch own profile"
opencli twitter profile -f json | jq '{username, followers, following}' || true

echo ""
echo "==> [4/4] Write path — post a benign timestamped tweet"
STAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEXT="opc-marketing-engine PoC ping ${STAMP} — testing opencli bridge"
echo "Posting: ${TEXT}"
opencli twitter post "${TEXT}" -f json | tee /tmp/opc-poc-post.json
echo ""
echo "Posted tweet id: $(jq -r '.id // .tweet_id // .url' /tmp/opc-poc-post.json)"
echo "PoC OK."
