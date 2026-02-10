#!/bin/bash
# 强制设置临时目录环境变量并执行构建
export TMPDIR=${TMPDIR:-/tmp}
export TMP=${TMP:-$TMPDIR}
export TEMP=${TEMP:-$TMPDIR}
mkdir -p "$TMPDIR" 2>/dev/null || true

# 执行构建命令
cd "$(dirname "$0")"
exec yarn build:web
