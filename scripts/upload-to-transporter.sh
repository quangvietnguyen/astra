#!/usr/bin/env bash
set -e

IPA_PATH="${1:-./builds/astra.ipa}"

echo "========================================================"
echo "🚀 Astra - App Store Connect / Transporter Deployment"
echo "========================================================"

if [ ! -f "$IPA_PATH" ]; then
  echo "❌ Error: Build artifact not found at '$IPA_PATH'."
  echo "👉 Please run 'pnpm run eas:build:local:ios' first to create the production .ipa file."
  exit 1
fi

echo "📦 Found iOS Archive: $IPA_PATH ($(du -h "$IPA_PATH" | cut -f1))"

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # 1. Check if Apple Transporter GUI app is installed in /Applications
  if [ -d "/Applications/Transporter.app" ]; then
    echo "📲 Launching Apple Transporter app with '$IPA_PATH'..."
    open -a "/Applications/Transporter.app" "$IPA_PATH"
    echo ""
    echo "✅ Transporter app is now open with your build package."
    echo "👉 In Transporter, click 'Deliver' to upload directly to App Store Connect / TestFlight."
    exit 0
  fi

  # 2. Check for App Store Connect API Key upload via xcrun altool
  if command -v xcrun &>/dev/null; then
    ASC_KEY_PATH="${EXPO_ASC_API_KEY_PATH:-}"
    if [ -z "$ASC_KEY_PATH" ] || [ ! -f "$ASC_KEY_PATH" ]; then
      # Find first .p8 file in ./secrets
      ASC_KEY_PATH=$(ls ./secrets/AuthKey_*.p8 2>/dev/null | head -n 1 || true)
    fi

    if [ -n "$ASC_KEY_PATH" ] && [ -f "$ASC_KEY_PATH" ]; then
      # Extract key ID from filename if not specified
      DETECTED_KEY_ID=$(basename "$ASC_KEY_PATH" | sed -n 's/^AuthKey_\(.*\)\.p8$/\1/p')
      ASC_KEY_ID="${EXPO_ASC_KEY_ID:-$DETECTED_KEY_ID}"
      ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-2c8ae852-2b19-41a0-92f9-559e6e68739c}"

      echo "🔑 Found App Store Connect API Key: $ASC_KEY_PATH (Key ID: $ASC_KEY_ID)"

      # xcrun altool looks for AuthKey_<KeyID>.p8 in ~/.appstoreconnect/private_keys or ~/.private_keys
      mkdir -p ~/.appstoreconnect/private_keys ~/.private_keys
      cp -f "$ASC_KEY_PATH" ~/.appstoreconnect/private_keys/ 2>/dev/null || true
      cp -f "$ASC_KEY_PATH" ~/.private_keys/ 2>/dev/null || true

      echo "🚀 Uploading directly to App Store Connect via xcrun altool..."
      xcrun altool --upload-app -f "$IPA_PATH" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
      echo "✅ Successfully uploaded to App Store Connect!"
      exit 0
    fi
  fi

  echo "💡 You can download the official Apple Transporter app from the Mac App Store:"
  echo "   https://apps.apple.com/app/transporter/id1450874784"
  echo "   Once installed, drag and drop '$IPA_PATH' into Transporter to deliver to TestFlight."
else
  echo "ℹ️ Non-macOS environment detected ($OSTYPE)."
  echo "👉 Copy '$IPA_PATH' to your macOS machine and open it with Apple Transporter.app."
fi
