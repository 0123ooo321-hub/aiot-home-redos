#!/usr/bin/env bash
set -eu
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'Для запуска нужен Python 3.7 или новее. Установите пакет python3 из репозитория РЕД ОС.' >&2
  exit 1
fi
exec python3 "$APP_DIR/launcher.py" "$@"
