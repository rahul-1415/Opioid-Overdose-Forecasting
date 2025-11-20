#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/deploy/ec2/docker-compose.yml"

echo "📦 Building and starting the opioid-overdose-backend container..."
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "✅ Deployment complete. Current container status:"
docker compose -f "${COMPOSE_FILE}" ps
