#!/usr/bin/env bash
set -e

# Default IPA path inside the repository build folder
IPA_PATH="${1:-./builds/astra.ipa}"

if [ ! -f "$IPA_PATH" ]; then
  echo "❌ Error: IPA file not found at: $IPA_PATH"
  echo "💡 Tip: Build your iOS app locally first using: pnpm run eas:build:local:ios"
  exit 1
fi

echo "📦 Found iOS App Binary: $IPA_PATH ($(du -h "$IPA_PATH" | cut -f1))"
echo "🚀 Uploading to Apple App Store Connect via Transporter..."

# 1. Check for App Store Connect API Key (JWT)
# Auto-detect AuthKey_*.p8 in secrets directory if not explicitly overridden
AUTO_DETECTED_P8=$(ls -1 ./secrets/AuthKey_*.p8 2>/dev/null | head -n 1 || true)
if [ -n "$AUTO_DETECTED_P8" ]; then
  AUTO_KEY_ID=$(basename "$AUTO_DETECTED_P8" | sed 's/AuthKey_//; s/\.p8//')
fi

ASC_KEY_PATH="${EXPO_ASC_API_KEY_PATH:-${AUTO_DETECTED_P8:-./secrets/AuthKey_X8Z7SH8JPZ.p8}}"
ASC_KEY_ID="${EXPO_ASC_KEY_ID:-${AUTO_KEY_ID:-X8Z7SH8JPZ}}"
ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-2c8ae852-2b19-41a0-92f9-559e6e68739c}"

# 2. Check for App-Specific Password
APP_SPECIFIC_PWD="${APP_STORE_CONNECT_PASSWORD:-${FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD:-${APPLE_APP_SPECIFIC_PASSWORD:-}}}"
APPLE_ID="${APPLE_ID:-viet.ngquang92@gmail.com}"

if [ -f "$ASC_KEY_PATH" ] && [ -n "$ASC_KEY_ID" ] && [ -n "$ASC_ISSUER_ID" ]; then
  echo "🔑 Authenticating with App Store Connect API Key ($ASC_KEY_ID)..."
  xcrun altool --upload-app \
    -f "$IPA_PATH" \
    -t ios \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID" \
    --p8-file-path "$ASC_KEY_PATH" \
    --show-progress
elif [ -n "$APP_SPECIFIC_PWD" ]; then
  echo "🔑 Authenticating via Apple ID ($APPLE_ID) & App-Specific Password via Transporter..."
  xcrun altool --upload-app \
    -f "$IPA_PATH" \
    -t ios \
    -u "$APPLE_ID" \
    -p "$APP_SPECIFIC_PWD" \
    --show-progress
else
  echo "ℹ️  No local ASC API key or App-Specific Password env var found."
  echo "🔄 Submitting using EAS CLI with your remote Expo/App Store credentials..."
  npx eas-cli submit --platform ios --profile production --path "$IPA_PATH"
fi

echo "✅ App upload process completed!"
