#!/bin/sh

set -e

OUTPUT_DIR="build"

echo "Cleaning up previous build..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "Compiling TypeScript to JavaScript..."
tsc --project tsconfig.json

cp -R src/ "$OUTPUT_DIR"/

echo "Build complete! Your clean, superior JavaScript lives in the '$OUTPUT_DIR' folder."
