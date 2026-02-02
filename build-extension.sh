#!/bin/bash
# Build AETHER VS Code Extension
# Compatible with: VS Code, Cursor, VSCodium, Code-OSS, Windsurf, Antigravity

set -e

echo "🔧 Building AETHER Extension..."

# Backup server package.json
if [ -f package.json ]; then
    cp package.json package-server-backup.json
fi

# Use extension package.json for build
cp extension-package.json package.json

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc -p ./extension-tsconfig.json

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Package VSIX
echo "📦 Creating VSIX package..."
npx vsce package --out "aether-mobile-${VERSION}.vsix"

# Restore server package.json
if [ -f package-server-backup.json ]; then
    mv package-server-backup.json package.json
fi

echo ""
echo "✅ Extension built: aether-mobile-${VERSION}.vsix"
echo ""
echo "📥 Install manually:"
echo "   VS Code:   code --install-extension aether-mobile-${VERSION}.vsix"
echo "   Cursor:    cursor --install-extension aether-mobile-${VERSION}.vsix"
echo "   VSCodium:  codium --install-extension aether-mobile-${VERSION}.vsix"
echo ""
echo "🌐 Publish to marketplaces:"
echo "   VS Code:   npx vsce publish"
echo "   Open VSX:  npx ovsx publish aether-mobile-${VERSION}.vsix -p \$OVSX_TOKEN"
