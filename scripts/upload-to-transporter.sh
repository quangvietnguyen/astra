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
    ASC_KEY_ID="${EXPO_ASC_KEY_ID:-X8Z7SH8JPZ}"
    ASC_ISSUER_ID="${EXPO_ASC_ISSUER_ID:-2c8ae852-2b19-41a0-92f9-559e6e68739c}"
    ASC_KEY_PATH="${EXPO_ASC_API_KEY_PATH:-./secrets/AuthKey_X8Z7SH8JPZ.p8}"

    if [ -f "$ASC_KEY_PATH" ]; then
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
