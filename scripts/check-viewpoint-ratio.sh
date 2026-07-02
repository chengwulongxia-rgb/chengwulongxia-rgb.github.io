#!/usr/bin/env bash
# check-viewpoint-ratio.sh — 檢查城武部落格文章的觀點/摘要字數比例
# 用法: ./check-viewpoint-ratio.sh <文章.md> [--threshold 0.9]
# 退出碼: 0 = 通過, 1 = 比例超標, 2 = 找不到對應區塊

set -euo pipefail

THRESHOLD="${THRESHOLD:-0.9}"
FILE=""

# 解析參數
while [[ $# -gt 0 ]]; do
    case "$1" in
        --threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        -*)
            echo "未知參數: $1" >&2
            exit 2
            ;;
        *)
            FILE="$1"
            shift
            ;;
    esac
done

if [[ -z "$FILE" ]]; then
    echo "用法: $0 <文章.md> [--threshold 0.9]" >&2
    exit 2
fi

if [[ ! -f "$FILE" ]]; then
    echo "❌ 檔案不存在: $FILE" >&2
    exit 2
fi

# 找出摘要區塊（支援多種標題格式）
SUMMARY_START=0
SUMMARY_END=0
SUMMARY_PATTERN=""

# 嘗試 ## 原文摘要
if grep -q '^## 原文摘要' "$FILE"; then
    SUMMARY_START=$(grep -n '^## 原文摘要' "$FILE" | head -1 | cut -d: -f1)
    SUMMARY_PATTERN="原文摘要"
# 嘗試 ## 論文摘要
elif grep -q '^## 論文摘要' "$FILE"; then
    SUMMARY_START=$(grep -n '^## 論文摘要' "$FILE" | head -1 | cut -d: -f1)
    SUMMARY_PATTERN="論文摘要"
# 嘗試 ## 摘要
elif grep -q '^## 摘要' "$FILE"; then
    SUMMARY_START=$(grep -n '^## 摘要' "$FILE" | head -1 | cut -d: -f1)
    SUMMARY_PATTERN="摘要"
else
    echo "❌ 找不到摘要區塊（## 原文摘要 / ## 論文摘要 / ## 摘要）" >&2
    exit 2
fi

# 找出城武觀點起始行
OPINION_START=$(grep -n '^## 城武觀點' "$FILE" | head -1 | cut -d: -f1)
if [[ -z "$OPINION_START" || "$OPINION_START" -eq 0 ]]; then
    echo "❌ 找不到 ## 城武觀點" >&2
    exit 2
fi

SUMMARY_END=$((OPINION_START - 1))

# 找出城武觀點結束行（優先找 punchline，否則到檔尾）
TOTAL_LINES=$(wc -l < "$FILE")
OPINION_END=$TOTAL_LINES

# 找 punchline（*城武的未解檔案*）
PUNCH_LINE=$(grep -n '\*城武的未解檔案' "$FILE" | head -1 | cut -d: -f1)
if [[ -n "$PUNCH_LINE" && "$PUNCH_LINE" -gt "$OPINION_START" ]]; then
    OPINION_END=$((PUNCH_LINE + 1))  # 包含 punchline 本身
fi

# 計算字元數（去掉空白行和 markdown 標記的干擾）
SUMMARY_CHARS=$(sed -n "${SUMMARY_START},${SUMMARY_END}p" "$FILE" \
    | sed 's/[[:space:]]//g' \
    | wc -c)

OPINION_CHARS=$(sed -n "${OPINION_START},${OPINION_END}p" "$FILE" \
    | sed 's/[[:space:]]//g' \
    | wc -c)

# 避免除以零
if [[ "$SUMMARY_CHARS" -eq 0 ]]; then
    echo "⚠️  摘要區塊為空（0 字元），無法計算比例" >&2
    exit 2
fi

# 計算比例
RATIO=$(echo "scale=4; $OPINION_CHARS / $SUMMARY_CHARS" | bc)
RATIO_PCT=$(echo "scale=1; $RATIO * 100" | bc)

# 判斷
PASS=$(echo "$RATIO <= $THRESHOLD" | bc -l)

echo "📄 $(basename "$FILE")"
echo "   摘要區塊: $SUMMARY_PATTERN (行 $SUMMARY_START-$SUMMARY_END, $SUMMARY_CHARS chars)"
echo "   觀點區塊: 城武觀點 (行 $OPINION_START-$OPINION_END, $OPINION_CHARS chars)"
echo "   比例: ${OPINION_CHARS}/${SUMMARY_CHARS} = ${RATIO_PCT}% (閾值: $(echo "scale=0; $THRESHOLD * 100" | bc)%)"

if [[ "$PASS" -eq 1 ]]; then
    echo "   ✅ 通過"
    exit 0
else
    echo "   ❌ 超標！觀點比摘要長，需要濃縮觀點或擴充摘要"
    exit 1
fi
