#!/bin/bash

# Setup script for Postgirl dev container
set -e

echo "🚀 Setting up Postgirl development environment..."

# Update system packages
sudo apt-get update

# Install additional system dependencies for Tauri
echo "📦 Installing system dependencies for Tauri..."
sudo apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libssl-dev \
    pkg-config \
    build-essential \
    curl \
    wget \
    file \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    libsoup2.4-dev

# Install Rust components
echo "🦀 Installing Rust components..."
rustup component add clippy rustfmt
rustup target add wasm32-unknown-unknown

# Install Tauri CLI
echo "⚡ Installing Tauri CLI..."
cargo install tauri-cli --version "^2.0"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd /workspaces/postgirl
npm install

# Install additional useful tools
echo "🔧 Installing additional development tools..."
cargo install sqlx-cli --no-default-features --features sqlite
cargo install cargo-watch

# Create cargo config for faster builds
echo "⚙️ Configuring Cargo for optimal development..."
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[build]
jobs = 4

[net]
retry = 3

[profile.dev]
debug = 1
incremental = true
EOF

# Set up git config if not already configured
if [ -z "$(git config --global user.name)" ]; then
    echo "⚙️ Setting up Git configuration..."
    git config --global user.name "Developer"
    git config --global user.email "developer@example.com"
    git config --global init.defaultBranch main
fi

# Create useful aliases
echo "🔧 Setting up useful aliases..."
cat >> ~/.bashrc << 'EOF'

# Postgirl development aliases
alias pg-dev='npm run tauri:dev'
alias pg-build='npm run tauri:build'
alias pg-test='cargo test --manifest-path=src-tauri/Cargo.toml'
alias pg-fmt='cargo fmt --manifest-path=src-tauri/Cargo.toml && npm run lint'
alias pg-check='cargo check --manifest-path=src-tauri/Cargo.toml'
alias pg-clean='cargo clean --manifest-path=src-tauri/Cargo.toml && rm -rf node_modules && rm -rf dist'

# Quick navigation
alias cdtauri='cd src-tauri'
alias cdsrc='cd src'
alias cdroot='cd /workspaces/postgirl'
EOF

# Make database directory
mkdir -p ~/.local/share/postgirl

echo "✅ Postgirl development environment setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  npm run tauri:dev    - Start development server"
echo "  npm run build        - Build frontend only"
echo "  npm run tauri:build  - Build complete desktop app"
echo "  pg-dev               - Alias for tauri:dev"
echo "  pg-test              - Run Rust tests"
echo ""
echo "📁 Navigate with:"
echo "  cdroot    - Go to project root"
echo "  cdtauri   - Go to src-tauri directory"
echo "  cdsrc     - Go to src directory"
echo ""
echo "Happy coding! 🚀"
