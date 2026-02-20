#!/bin/bash
# 清理 /tmp 中的临时文件
# 清理超过1小时的 yarn 临时目录
find /tmp -name "yarn-*" -type d -mmin +60 -exec rm -rf {} \; 2>/dev/null
# 清理超过1小时的 v8-compile-cache
find /tmp -name "v8-compile-cache-*" -type d -mmin +60 -exec rm -rf {} \; 2>/dev/null
# 清理其他临时文件（超过1小时）
find /tmp -type f -mmin +60 -delete 2>/dev/null
find /tmp -type d -empty -mmin +60 -delete 2>/dev/null
echo "$(date): 清理完成，当前 /tmp 使用: $(du -sh /tmp 2>/dev/null | cut -f1)"
