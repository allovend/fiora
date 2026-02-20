#!/bin/bash
# 强制设置临时目录环境变量
export TMPDIR=${TMPDIR:-/tmp}
export TMP=${TMP:-$TMPDIR}
export TEMP=${TEMP:-$TMPDIR}
mkdir -p "$TMPDIR" 2>/dev/null || true
