#!/bin/bash
set -e

cd /Users/michalmatynia/Desktop/NPM/2026/Gemini\ new\ Pull/geminitestapp

# Create all directories
mkdir -p src/shared/contracts/ui/component-props
mkdir -p src/shared/contracts/hooks
mkdir -p src/shared/contracts/context
mkdir -p src/shared/contracts/kangur-repositories
mkdir -p src/shared/contracts/workers
mkdir -p src/shared/contracts/forms

echo "Directories created successfully"

# Verify they exist
ls -la src/shared/contracts/ | grep "^d"
