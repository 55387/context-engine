#!/bin/bash

# Git 凭据清除脚本

echo "🔐 Git 凭据管理"
echo "================"
echo ""

echo "当前问题："
echo "  推送被拒绝: Permission denied to RossLin007"
echo "  原因: Git 使用了错误的 GitHub 凭据"
echo ""

echo "解决方案："
echo ""

echo "1️⃣ 清除 GitHub 凭据..."
git credential-osxkeychain erase <<EOF
protocol=https
host=github.com
EOF

echo "✓ GitHub 凭据已清除"
echo ""

echo "2️⃣ 下次推送时，Git 会要求您输入:"
echo "  - GitHub 用户名（有权限访问 55387/context-engine 的账号）"
echo "  - Personal Access Token (PAT) 或密码"
echo ""

echo "📝 如何获取 GitHub Personal Access Token:"
echo "  1. 访问 https://github.com/settings/tokens"
echo "  2. 点击 'Generate new token (classic)'"
echo "  3. 选择权限: repo (完整仓库访问)"
echo "  4. 复制生成的 token"
echo "  5. 推送时使用 token 作为密码"
echo ""

echo "🚀 现在可以尝试推送:"
echo "  git push -u origin main"
echo ""

echo "💡 或者使用 SSH 方式（更推荐）:"
echo "  git remote set-url origin git@github.com:55387/context-engine.git"
echo "  git push -u origin main"
