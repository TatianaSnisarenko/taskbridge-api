#!/usr/bin/env sh
set -e

# Run DB migrations on start (safe for container restarts)
node ./node_modules/.bin/prisma migrate deploy

exec "$@"
