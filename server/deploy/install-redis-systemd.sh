#!/usr/bin/env bash
set -euo pipefail

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is required for this installer." >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y redis-server
  sudo systemctl enable --now redis-server
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y redis
  sudo systemctl enable --now redis
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y redis
  sudo systemctl enable --now redis
else
  echo "Unsupported package manager. Install Redis manually, then enable it with systemd." >&2
  exit 1
fi

redis-cli ping
