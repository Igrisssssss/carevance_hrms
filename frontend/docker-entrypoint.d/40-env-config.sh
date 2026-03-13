#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: "$(json_escape "${VITE_API_URL:-}")",
  VITE_WEB_APP_URL: "$(json_escape "${VITE_WEB_APP_URL:-}")",
  VITE_DESKTOP_DOWNLOAD_URL: "$(json_escape "${VITE_DESKTOP_DOWNLOAD_URL:-}")",
  VITE_DESKTOP_DOWNLOAD_LABEL: "$(json_escape "${VITE_DESKTOP_DOWNLOAD_LABEL:-}")"
};
EOF
