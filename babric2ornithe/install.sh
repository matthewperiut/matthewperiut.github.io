#!/bin/sh
set -e

VERSION="0.1.0"
BASE_URL="https://matthewperiut.github.io/babric2ornithe"

echo "Installing babric2ornithe v${VERSION}..."

OS="$(uname -s)"
case "$OS" in
    Linux*)  OS="linux" ;;
    Darwin*) OS="darwin" ;;
    *)
        echo "Error: Unsupported OS: $OS"
        echo "babric2ornithe is available for Linux and macOS."
        echo "For Windows, use PowerShell: irm https://matthewperiut.github.io/babric2ornithe/install.ps1 | iex"
        exit 1
        ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
        echo "Error: Unsupported architecture: $ARCH"
        echo "babric2ornithe is available for x86_64 and arm64."
        exit 1
        ;;
esac

BINARY="babric2ornithe-${OS}-${ARCH}"
URL="${BASE_URL}/bin/${BINARY}"

INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Downloading ${BINARY}..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "${INSTALL_DIR}/babric2ornithe"
elif command -v wget >/dev/null 2>&1; then
    wget -qO "${INSTALL_DIR}/babric2ornithe" "$URL"
else
    echo "Error: curl or wget is required"
    exit 1
fi

chmod +x "${INSTALL_DIR}/babric2ornithe"

# Save source URL for remote manifest lookups
CONFIG_DIR="${HOME}/.config/babric2ornithe"
mkdir -p "$CONFIG_DIR"
echo "${BASE_URL}" > "${CONFIG_DIR}/source_url"

echo "Installed babric2ornithe v${VERSION} to ${INSTALL_DIR}/babric2ornithe"

case ":$PATH:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
        echo ""
        echo "Warning: ${INSTALL_DIR} is not in your PATH. Add it with:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        ;;
esac

echo ""
echo "Run 'babric2ornithe --help' to get started."
