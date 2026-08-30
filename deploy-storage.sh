#!/bin/bash
# Shadow Nexus Wave — deploy Firebase Storage rules + CORS
# Run this AFTER Firebase Storage has been initialized at:
# https://console.firebase.google.com/project/shadow-nexus-wave/storage
#
# Prerequisites:
#   gcloud CLI installed and authenticated:  gcloud auth login
#   firebase CLI installed and authenticated: firebase login
#
# Usage:
#   chmod +x deploy-storage.sh
#   ./deploy-storage.sh

set -e

PROJECT_ID="shadow-nexus-wave"
BUCKET="shadow-nexus-wave.firebasestorage.app"
WAVE_CONFIG="firebase-wave.json"

echo "=== Shadow Nexus Wave — Storage Deploy ==="
echo "Project : $PROJECT_ID"
echo "Bucket  : $BUCKET"
echo ""

# 1. Apply CORS configuration
echo "--- Applying CORS rules to gs://$BUCKET ---"
gcloud storage buckets update "gs://$BUCKET" --cors-file=cors.json --project="$PROJECT_ID"
echo "✓ CORS applied"

# 2. Deploy Firebase Storage security rules
echo ""
echo "--- Deploying Storage security rules → $PROJECT_ID ---"
firebase deploy --only storage --project "$PROJECT_ID" --config "$WAVE_CONFIG"
echo "✓ Storage rules deployed"

echo ""
echo "=== Done ==="
echo "Storage rules and CORS deployed to: $PROJECT_ID"
echo ""
