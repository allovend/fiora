#!/bin/bash
# Fiora 服务启动脚本
# 设置临时目录环境变量，防止使用 /tmp

# 设置自定义临时目录
export TMPDIR=${TMPDIR:-/tmp}
export TMP=${TMP:-$TMPDIR}
export TEMP=${TEMP:-$TMPDIR}

# 设置 Node.js v8-compile-cache 目录
export NODE_OPTIONS="--max-old-space-size=4096"

# 确保临时目录存在
mkdir -p "$TMPDIR" 2>/dev/null || true

# 切换到服务器目录（相对路径，跨平台/跨部署环境可用）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/packages/server"

# 启动服务
#
# 注意：bash 的 `exec` 不能直接写成 `exec KEY=VALUE cmd ...`
# 正确写法是：
# - `KEY=VALUE exec cmd ...`（先设置环境变量，再 exec）
# - 或 `exec env KEY=VALUE cmd ...`
#
# 这里用 `env` 的方式最直观，也避免不同 shell 的兼容性差异。
exec env NODE_ENV=production DOTENV_CONFIG_PATH=../../.env npx ts-node -r dotenv/config --transpile-only src/main.ts "$@"

