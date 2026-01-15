#!/usr/bin/env bash

# Base URL for redirects/callbacks. Override when running behind a real domain.
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-}"
if [[ -n "${PUBLIC_BASE_URL}" ]]; then
  export NEXTAUTH_URL="${PUBLIC_BASE_URL}"
else
  unset NEXTAUTH_URL
fi
export NEXTAUTH_TRUST_HOST="${NEXTAUTH_TRUST_HOST:-true}"


set -euo pipefail
cd "$(dirname "$0")"

unset DATABASE_URL
export NEXT_DISABLE_TURBOPACK=1

set -a
source ./.env
set +a

npm run dev
