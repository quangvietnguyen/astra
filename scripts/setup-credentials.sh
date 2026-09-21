#!/usr/bin/env bash
set -e

echo "========================================================"
echo "🔐 Astra - iOS Credentials & App Store Connect Setup"
echo "========================================================"

mkdir -p ./secrets

P8_FILE=$(ls ./secrets/AuthKey_*.p8 2>/dev/null | head -n 1 || true)

if [ -z "$P8_FILE" ]; then
  echo "⚠️ No .p8 file found in ./secrets/"
  echo "👉 Please copy your App Store Connect API Key (e.g. AuthKey_X8Z7SH8JPZ.p8) into ./secrets/"
  echo ""
  echo "Example:"
  echo "   cp /path/to/AuthKey_XXXXXX.p8 ./secrets/"
  echo ""
  exit 1
fi

KEY_ID=$(basename "$P8_FILE" | sed -n 's/^AuthKey_\(.*\)\.p8$/\1/p')
ISSUER_ID="2c8ae852-2b19-41a0-92f9-559e6e68739c"
TEAM_ID="DL3DFHTCY5"

echo "✅ Found API Key: $P8_FILE"
echo "   Key ID:    $KEY_ID"
echo "   Issuer ID: $ISSUER_ID"
echo "   Team ID:   $TEAM_ID"
echo ""

# Copy to macOS standard locations for xcrun/altool
if [[ "$OSTYPE" == "darwin"* ]]; then
  mkdir -p ~/.appstoreconnect/private_keys ~/.private_keys
  cp -f "$P8_FILE" ~/.appstoreconnect/private_keys/ 2>/dev/null || true
  cp -f "$P8_FILE" ~/.private_keys/ 2>/dev/null || true
  echo "✅ Copied key to ~/.appstoreconnect/private_keys/ for xcrun altool"
fi

echo ""
echo "🚀 Configuring EAS credentials on Expo with your App Store Connect Key..."
npx eas-cli credentials:configure-build -p ios -e production

echo ""
echo "🎉 Credentials configured! You can now build with 'pnpm run eas:build:local:ios'."
