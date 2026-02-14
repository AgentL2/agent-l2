#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentL2 Database Initialization ==="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required."
  echo "Example: DATABASE_URL=postgresql://agentl2:password@localhost:5432/agentl2"
  exit 1
fi

echo "Generating Prisma client..."
cd "$(dirname "$0")/.."
npx prisma generate --schema=prisma/schema.prisma

echo "Running database migrations..."
npx prisma migrate dev --name init --schema=prisma/schema.prisma

echo "=== Database initialized successfully ==="
