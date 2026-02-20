#!/bin/bash
# 清理 /tmp 中超过1小时的 yarn 临时目录
find /tmp -name "yarn-*" -type d -mmin +60 -exec rm -rf {} \; 2>/dev/null
echo "$(date): 清理完成"
