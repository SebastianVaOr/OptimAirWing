#!/bin/bash
# Build XFOIL to WebAssembly using Emscripten
# Requires Docker or emsdk installed locally.
#
# Usage:
#   docker build -t xfoil-wasm .
#   docker run --rm -v $(pwd)/output:/output xfoil-wasm

set -euo pipefail

# Install dependencies
apt-get update && apt-get install -y \
    gfortran \
    make \
    git \
    wget \
    unzip \
    || echo "Skipping apt (already installed)"

# Clone XFOIL if not present
if [ ! -d "xfoil" ]; then
    git clone --depth 1 https://github.com/drela/xfoil.git
fi

cd xfoil

# EMSCRIPTEN_COMPRESSOR disabled, full optimize
# Note: XFOIL is a Fortran/C codebase. We compile the core panel method subroutines.

rm -f ../output/xfoil.wasm ../output/xfoil.js
mkdir -p ../output

# Compile core XFOIL library to WASM.
# Using SimpleWASM for modularized output that works with onnxruntime-web style init.
emcc -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createXFOIL' \
    -s EXPORTED_FUNCTIONS='["_runAnalysis", "_initAirfoil", "_getCL", "_getCD", "_getCM", "_main"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=134217728 \
    -s ENVIRONMENT='web,worker' \
    -s ASSERTIONS=0 \
    -s FILESYSTEM=0 \
    -o ../output/xfoil.js \
    src/*.c \
    || echo "Emscripten compilation failed (may need manual file list)"

# Fallback: copy pre-built if available
if [ ! -f "../output/xfoil.wasm" ]; then
    echo "No WASM produced. Expected output: xfoil.js, xfoil.wasm"
    exit 1
fi

echo "Build complete:"
ls -lh ../output/