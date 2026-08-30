#!/bin/bash
# Shadow Nexus Wave — Deploy Firestore rules + indexes
# Run this to apply Firestore security rule changes to the Wave project.
#
# Usage:
#   chmod +x deploy-firestore-rules.sh
#   ./deploy-firestore-rules.sh

set -e

WAVE_PROJECT="shadow-nexus-wave"
WAVE_CONFIG="firebase-wave.json"

echo "=== Shadow Nexus Wave — Deploying Firestore rules + indexes ==="
echo "TARGET PROJECT: $WAVE_PROJECT"
echo ""

# Check firebase CLI
if ! command -v firebase &>/dev/null; then
  echo "ERROR: firebase CLI not found. Install with: npm install -g firebase-tools"
  exit 1
fi

# Check login status
echo "Checking Firebase authentication..."
firebase projects:list --json &>/dev/null || {
  echo "Not logged in. Running firebase login..."
  firebase login
}

echo ""
echo "Deploying Firestore security rules → $WAVE_PROJECT..."
firebase deploy --only firestore:rules --project "$WAVE_PROJECT" --config "$WAVE_CONFIG"

echo ""
echo "Deploying Firestore indexes → $WAVE_PROJECT..."
firebase deploy --only firestore:indexes --project "$WAVE_PROJECT" --config "$WAVE_CONFIG"

echo ""
echo "Deploying updated hosting files → $WAVE_PROJECT..."
firebase deploy --only hosting --project "$WAVE_PROJECT" --config "$WAVE_CONFIG"

echo ""
echo "=== DONE ==="
echo "Firestore rules, indexes, and hosting deployed to: $WAVE_PROJECT"
echo ""
