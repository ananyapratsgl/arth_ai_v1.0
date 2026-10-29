#!/usr/bin/env bash
set -Eeuo pipefail

# ARTH AI first-time setup. Safe to re-run; existing local configuration is preserved.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/arth-backend"
FRONTEND_DIR="${PROJECT_ROOT}/arth-frontend"
ENV_EXAMPLE="${BACKEND_DIR}/.env.example"
ENV_FILE="${BACKEND_DIR}/.env"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '\n==> %s\n' "$*"
}

command -v git >/dev/null 2>&1 || fail "Git is required. Install Git, then run this script again."
command -v python3 >/dev/null 2>&1 || fail "Python 3 is required. Install Python 3, then run this script again."
command -v node >/dev/null 2>&1 || fail "Node.js is required. Install a Node.js version compatible with the frontend, then run this script again."
command -v npm >/dev/null 2>&1 || fail "npm is required. Install Node.js/npm, then run this script again."

[[ -f "${BACKEND_DIR}/requirements.txt" ]] || fail "Missing arth-backend/requirements.txt."
[[ -f "${FRONTEND_DIR}/package.json" ]] || fail "Missing arth-frontend/package.json."
[[ -f "${FRONTEND_DIR}/package-lock.json" ]] || fail "Missing arth-frontend/package-lock.json; npm ci requires a lockfile."
[[ -f "${ENV_EXAMPLE}" ]] || fail "Missing arth-backend/.env.example."

info "Checking tool versions"
printf 'Python: '; python3 --version
printf 'Node.js: '; node --version
printf 'npm: '; npm --version

info "Preparing backend virtual environment"
if [[ ! -d "${BACKEND_DIR}/.venv" ]]; then
  python3 -m venv "${BACKEND_DIR}/.venv"
else
  printf 'Using existing backend virtual environment.\n'
fi

"${BACKEND_DIR}/.venv/bin/python" -m pip install --upgrade pip
"${BACKEND_DIR}/.venv/bin/python" -m pip install -r "${BACKEND_DIR}/requirements.txt"

info "Preparing local backend configuration"
if [[ -e "${ENV_FILE}" ]]; then
  printf 'Existing arth-backend/.env found; leaving it unchanged.\n'
else
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}" 2>/dev/null || true
  printf 'Created arth-backend/.env from .env.example.\n'
  printf 'Before using AI features, edit arth-backend/.env and configure the provider settings and API key required by the backend.\n'
fi

info "Installing frontend dependencies"
(
  cd "${FRONTEND_DIR}"
  npm ci
)

printf '\nSetup completed.\n'
printf 'Next steps:\n'
printf '  1. Review arth-backend/.env locally and configure valid provider settings.\n'
printf '  2. Start ARTH AI with: ./scripts/arth.sh start\n'
printf '  3. Check services with: ./scripts/arth.sh status\n'
printf '\nThis script does not start services or verify AI-provider credentials.\n'
