#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/llama.cpp"
BUILD_DIR="$REPO_DIR/build"
SERVICE="llama-server.service"

find_nvcc() {
    if command -v nvcc >/dev/null 2>&1; then
        command -v nvcc
        return 0
    fi

    for p in \
        /usr/local/cuda/bin/nvcc \
        /usr/bin/nvcc \
        /opt/cuda/bin/nvcc
    do
        if [ -x "$p" ]; then
            echo "$p"
            return 0
        fi
    done

    return 1
}

echo "==> Installing required packages"
sudo apt update
sudo apt install -y \
    git \
    build-essential \
    cmake \
    ninja-build \
    pkg-config \
    libssl-dev

echo "==> Stopping $SERVICE"
sudo systemctl stop "$SERVICE" || true

echo "==> Validating repo path"
if [ ! -d "$REPO_DIR" ]; then
    echo "ERROR: $REPO_DIR does not exist"
    exit 1
fi

echo "==> Fixing broken build path if needed"
if [ -e "$BUILD_DIR" ] && [ ! -d "$BUILD_DIR" ]; then
    sudo rm -f "$BUILD_DIR"
fi

echo "==> Creating build directory"
sudo mkdir -p "$BUILD_DIR"

echo "==> Fixing ownership"
sudo chown -R "$USER:$USER" "$REPO_DIR"

echo "==> Locating nvcc"
NVCC_PATH="$(find_nvcc || true)"
if [ -z "${NVCC_PATH:-}" ]; then
    echo "ERROR: nvcc not found."
    echo "Install the NVIDIA CUDA toolkit so the CUDA compiler is available, then rerun this script."
    exit 1
fi

echo "==> Using nvcc: $NVCC_PATH"
export CUDACXX="$NVCC_PATH"

echo "==> Verifying OpenSSL files"
OPENSSL_INCLUDE_DIR="/usr/include"
OPENSSL_CRYPTO_LIBRARY="/usr/lib/x86_64-linux-gnu/libcrypto.so"
OPENSSL_SSL_LIBRARY="/usr/lib/x86_64-linux-gnu/libssl.so"

if [ ! -d "$OPENSSL_INCLUDE_DIR" ]; then
    echo "ERROR: OpenSSL include directory not found: $OPENSSL_INCLUDE_DIR"
    exit 1
fi

if [ ! -f "$OPENSSL_CRYPTO_LIBRARY" ]; then
    echo "ERROR: OpenSSL crypto library not found: $OPENSSL_CRYPTO_LIBRARY"
    exit 1
fi

if [ ! -f "$OPENSSL_SSL_LIBRARY" ]; then
    echo "ERROR: OpenSSL SSL library not found: $OPENSSL_SSL_LIBRARY"
    exit 1
fi

cd "$REPO_DIR"

echo "==> Clearing stale CMake cache"
rm -f "$BUILD_DIR/CMakeCache.txt"

echo "==> Configuring llama.cpp with CUDA and OpenSSL"
cmake -S . -B "$BUILD_DIR" -G Ninja \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_COMPILER="$NVCC_PATH" \
  -DOPENSSL_ROOT_DIR=/usr \
  -DOPENSSL_INCLUDE_DIR="$OPENSSL_INCLUDE_DIR" \
  -DOPENSSL_CRYPTO_LIBRARY="$OPENSSL_CRYPTO_LIBRARY" \
  -DOPENSSL_SSL_LIBRARY="$OPENSSL_SSL_LIBRARY"

echo "==> Building"
cmake --build "$BUILD_DIR" -j"$(nproc)"

echo "==> Verifying build"
/opt/llama.cpp/build/bin/llama-server --version
/opt/llama.cpp/build/bin/llama-server --help | grep -i reasoning || true

echo "==> Done"
