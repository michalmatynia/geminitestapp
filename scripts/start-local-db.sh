#!/bin/bash
# Start local MongoDB and database-engine-web

set -e

echo "→ Checking MongoDB status..."
MONGO_STATUS=$(brew services list | grep mongodb-community | awk '{print $2}')

if [ "$MONGO_STATUS" = "started" ]; then
  echo "✓ MongoDB is already running"
else
  echo "→ Starting MongoDB..."
  brew services start mongodb-community@7.0
  sleep 2
fi

echo "→ Verifying connection..."
if mongosh --quiet --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
  echo "✓ MongoDB is up at 127.0.0.1:27017"
else
  echo "✗ MongoDB failed to connect — check /usr/local/var/log/mongodb/mongo.log"
  exit 1
fi

echo ""
echo "→ Starting database-engine-web on http://localhost:3500 ..."
cd "$(dirname "$0")/../apps/database-engine-web"
npm run dev
