#!/bin/bash

# GitHub 提交脚本

echo "📦 Context Engine - GitHub 提交"
echo "================================"
echo ""

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo "📝 检测到未提交的更改:"
    git status --short
    echo ""
    
    # 添加所有文件
    echo "➕ 添加文件到 Git..."
    git add .
    
    # 提交
    read -p "请输入提交信息 (默认: Update): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"Update"}
    
    git commit -m "$COMMIT_MSG"
    echo "✓ 提交成功"
else
    echo "✓ 没有未提交的更改"
fi

echo ""
echo "🔗 配置远程仓库..."

# 检查是否已有远程仓库
if git remote | grep -q "origin"; then
    echo "✓ 远程仓库已配置:"
    git remote -v
else
    echo "⚠ 未配置远程仓库"
    echo ""
    echo "请提供 GitHub 仓库地址，格式如下:"
    echo "  HTTPS: https://github.com/用户名/仓库名.git"
    echo "  SSH:   git@github.com:用户名/仓库名.git"
    echo ""
    read -p "GitHub 仓库地址: " REPO_URL
    
    if [[ -n "$REPO_URL" ]]; then
        git remote add origin "$REPO_URL"
        echo "✓ 远程仓库已添加"
    else
        echo "✗ 未提供仓库地址，跳过"
        exit 0
    fi
fi

echo ""
echo "📤 推送到 GitHub..."
read -p "推送到哪个分支? (默认: main): " BRANCH
BRANCH=${BRANCH:-main}

# 确保在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
if [[ -z "$CURRENT_BRANCH" ]]; then
    # 首次提交，创建分支
    git branch -M "$BRANCH"
    echo "✓ 创建分支: $BRANCH"
fi

# 推送
if git push -u origin "$BRANCH"; then
    echo ""
    echo "🎉 成功推送到 GitHub!"
    echo ""
    echo "查看仓库:"
    git remote get-url origin | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//'
else
    echo ""
    echo "⚠ 推送失败，可能需要先创建仓库或检查权限"
    echo ""
    echo "手动推送命令:"
    echo "  git push -u origin $BRANCH"
fi
