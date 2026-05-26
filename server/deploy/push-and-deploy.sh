#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <user@host> [remote_app_dir]" >&2
  exit 1
fi

TARGET=$1
REMOTE_APP_DIR=${2:-/srv/c-quiz-app}
ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
SERVER_NAME=${TARGET#*@}

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.claude' \
  --exclude 'AGENTS.md' \
  --exclude 'CLAUDE.md' \
  "${ROOT_DIR}/" "${TARGET}:${REMOTE_APP_DIR}/"

ssh "${TARGET}" "cd '${REMOTE_APP_DIR}' && chmod +x server/deploy/deploy-centos-systemd.sh && APP_DIR='${REMOTE_APP_DIR}' SERVER_NAME='${SERVER_NAME}' bash server/deploy/deploy-centos-systemd.sh"
