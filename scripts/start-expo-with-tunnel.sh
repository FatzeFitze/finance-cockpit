#!/usr/bin/env bash

set -u

# Robust Expo tunnel launcher for WSL/Linux.
#
# Usage:
#   ./scripts/start-expo-tunnel.sh
#
# Optional env vars:
#   MAX_ATTEMPTS=10 ./scripts/start-expo-tunnel.sh
#   RETRY_DELAY_SECONDS=8 ./scripts/start-expo-tunnel.sh
#   CLEAR_EXPO_CACHE=0 ./scripts/start-expo-tunnel.sh

MAX_ATTEMPTS="${MAX_ATTEMPTS:-6}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-6}"
CLEAR_EXPO_CACHE="${CLEAR_EXPO_CACHE:-1}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

echo "Starting Expo in tunnel mode from:"
echo "  $PROJECT_ROOT"
echo

cleanup_tunnel_processes() {
  echo "Cleaning up possible stale tunnel processes..."

  # These may fail if no process exists, so ignore errors.
  pkill -f "@expo/ngrok" 2>/dev/null || true
  pkill -f "ngrok" 2>/dev/null || true

  # Give the OS a moment to release ports/process state.
  sleep 2
}

check_project_dependency() {
  if ! npm ls @expo/ngrok >/dev/null 2>&1; then
    echo "Warning: @expo/ngrok is not installed in this project."
    echo "Install it with:"
    echo "  npm install --save-dev @expo/ngrok"
    echo
  fi
}

start_expo_tunnel() {
  if [[ "$CLEAR_EXPO_CACHE" == "1" ]]; then
    npx expo start -c --tunnel
  else
    npx expo start --tunnel
  fi
}

check_project_dependency

attempt=1

while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  echo
  echo "============================================================"
  echo "Expo tunnel start attempt $attempt / $MAX_ATTEMPTS"
  echo "============================================================"
  echo

  cleanup_tunnel_processes

  start_expo_tunnel
  exit_code=$?

  echo
  echo "Expo exited with code: $exit_code"

  if [[ "$attempt" -eq "$MAX_ATTEMPTS" ]]; then
    echo
    echo "Tunnel startup failed after $MAX_ATTEMPTS attempts."
    echo
    echo "Recommended fallback for Android emulator:"
    echo "  npx expo start -c --localhost"
    echo "Then press:"
    echo "  a"
    echo
    echo "If needed, in another terminal:"
    echo "  adb reverse tcp:8081 tcp:8081"
    exit "$exit_code"
  fi

  echo
  echo "Retrying in $RETRY_DELAY_SECONDS seconds..."
  sleep "$RETRY_DELAY_SECONDS"

  attempt=$((attempt + 1))
done