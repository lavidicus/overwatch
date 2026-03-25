#!/bin/bash
# fix-matrix-crypto.sh — Ensures Matrix E2EE crypto modules are installed and patched
# Run after any OpenClaw update/install to prevent crypto module loss
#
# Issues addressed:
# 1. npm install during OpenClaw updates wipes manually-added crypto packages
# 2. ES module bundling breaks __dirname in crypto-node.runtime (2026.3.23+)
# 3. WASM symlink missing after updates
#
# Reference: pkb/areas/System guides/Matrix E2EE and Crypto SDK.md
# Playbook: ITIL/playbooks/matrix-e2ee-media-failures.md

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-/home/localadmin/.npm-global/lib/node_modules/openclaw}"
DIST_DIR="$OPENCLAW_DIR/dist"
WASM_LINK="$DIST_DIR/pkg/matrix_sdk_crypto_wasm_bg.wasm"

echo "[fix-matrix-crypto] Checking Matrix crypto modules..."

# ─── 1. Install native crypto module if missing ───
if ! find "$OPENCLAW_DIR/node_modules/@matrix-org/matrix-sdk-crypto-nodejs" -name "*.node" 2>/dev/null | grep -q .; then
    echo "[fix-matrix-crypto] Installing @matrix-org/matrix-sdk-crypto-nodejs..."
    cd "$OPENCLAW_DIR" && npm install @matrix-org/matrix-sdk-crypto-nodejs --no-save 2>&1 | tail -3
else
    echo "[fix-matrix-crypto] ✅ matrix-sdk-crypto-nodejs native binary present"
fi

# ─── 2. Install WASM crypto module if missing ───
WASM_SRC="$OPENCLAW_DIR/node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm"
if [ ! -f "$WASM_SRC" ]; then
    echo "[fix-matrix-crypto] Installing @matrix-org/matrix-sdk-crypto-wasm..."
    cd "$OPENCLAW_DIR" && npm install @matrix-org/matrix-sdk-crypto-wasm --no-save 2>&1 | tail -3
else
    echo "[fix-matrix-crypto] ✅ matrix-sdk-crypto-wasm OK"
fi

# ─── 3. Ensure WASM symlink ───
if [ -f "$WASM_SRC" ] && [ ! -e "$WASM_LINK" ]; then
    mkdir -p "$(dirname "$WASM_LINK")"
    ln -sf "$WASM_SRC" "$WASM_LINK"
    echo "[fix-matrix-crypto] ✅ WASM symlink created"
elif [ -e "$WASM_LINK" ]; then
    echo "[fix-matrix-crypto] ✅ WASM symlink OK"
fi

# ─── 4. Patch __dirname in crypto-node.runtime (ES module fix) ───
CRYPTO_FILE=$(ls "$DIST_DIR"/crypto-node.runtime-*.js 2>/dev/null | head -1)
NATIVE_DIR=$(find "$OPENCLAW_DIR/node_modules/@matrix-org/matrix-sdk-crypto-nodejs" -name "*.node" -exec dirname {} \; 2>/dev/null | head -1)

if [ -n "$CRYPTO_FILE" ] && [ -n "$NATIVE_DIR" ]; then
    # Check if already patched
    if head -1 "$CRYPTO_FILE" | grep -q "const __dirname"; then
        echo "[fix-matrix-crypto] ✅ __dirname patch already applied"
    else
        echo "[fix-matrix-crypto] Applying __dirname patch to $(basename "$CRYPTO_FILE")..."
        cp "$CRYPTO_FILE" "${CRYPTO_FILE}.bak"

        # Add __dirname definition at top
        sed -i "1s|^|const __dirname = \"${NATIVE_DIR}\";\n|" "$CRYPTO_FILE"

        # Change relative requires to absolute paths
        sed -i 's|__require("./matrix-sdk-crypto\.|__require(__dirname + "/matrix-sdk-crypto.|g' "$CRYPTO_FILE"

        echo "[fix-matrix-crypto] ✅ __dirname patch applied"
    fi

    # Verify the path is correct
    if head -1 "$CRYPTO_FILE" | grep -q "const __dirname"; then
        PATCHED_DIR=$(head -1 "$CRYPTO_FILE" | grep -o '"[^"]*"' | tr -d '"')
        if [ -d "$PATCHED_DIR" ]; then
            NATIVE_BIN=$(ls "$PATCHED_DIR"/matrix-sdk-crypto.linux-x64-gnu.node 2>/dev/null)
            if [ -n "$NATIVE_BIN" ]; then
                echo "[fix-matrix-crypto] ✅ Native binary verified at $PATCHED_DIR"
            else
                echo "[fix-matrix-crypto] ⚠️  Native binary NOT found at $PATCHED_DIR — updating path"
                sed -i "1s|const __dirname = .*|const __dirname = \"${NATIVE_DIR}\";|" "$CRYPTO_FILE"
            fi
        else
            echo "[fix-matrix-crypto] ⚠️  Patched __dirname directory doesn't exist — updating"
            sed -i "1s|const __dirname = .*|const __dirname = \"${NATIVE_DIR}\";|" "$CRYPTO_FILE"
        fi
    fi
else
    if [ -z "$CRYPTO_FILE" ]; then
        echo "[fix-matrix-crypto] ⚠️  No crypto-node.runtime file found in $DIST_DIR"
    fi
    if [ -z "$NATIVE_DIR" ]; then
        echo "[fix-matrix-crypto] ⚠️  No native .node binary found"
    fi
fi

echo "[fix-matrix-crypto] Done."
echo ""
echo "Next steps:"
echo "  1. Restart gateway: openclaw gateway restart"
echo "  2. Verify crypto:   openclaw matrix verify status"
echo "  3. Test image:      Send a test image via Matrix"
