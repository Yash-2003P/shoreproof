#!/bin/sh
set -eu

# A named volume mounted at /data is owned by root on first use. Fix ownership
# once, then drop to the unprivileged node user for the server process.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R node:node /data
  exec runuser -u node -- "$@"
fi

exec "$@"
