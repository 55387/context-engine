#!/bin/bash

# Git 用户切换脚本

echo "🔄 Git 用户配置"
echo "================"
echo ""

# 显示当前配置
echo "📋 当前 Git 配置:"
echo ""
echo "全局配置:"
echo "  用户名: $(git config --global user.name || echo '未设置')"
echo "  邮箱:   $(git config --global user.email || echo '未设置')"
echo ""
echo "当前项目配置:"
echo "  用户名: $(git config --local user.name || echo '未设置')"
echo "  邮箱:   $(git config --local user.email || echo '未设置')"
echo ""

# 询问修改级别
echo "请选择配置级别:"
echo "  1) 全局配置（所有项目）"
echo "  2) 当前项目配置（仅此项目）"
read -p "选择 (1-2): " LEVEL_CHOICE

case $LEVEL_CHOICE in
    1)
        LEVEL="--global"
        LEVEL_NAME="全局"
        ;;
    2)
        LEVEL="--local"
        LEVEL_NAME="当前项目"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "🔧 设置 ${LEVEL_NAME} Git 用户..."
echo ""

# 输入新的用户信息
read -p "用户名 (Name): " USERNAME
read -p "邮箱 (Email): " EMAIL

# 验证输入
if [[ -z "$USERNAME" ]] || [[ -z "$EMAIL" ]]; then
    echo "❌ 用户名和邮箱不能为空"
    exit 1
fi

# 设置配置
git config $LEVEL user.name "$USERNAME"
git config $LEVEL user.email "$EMAIL"

echo ""
echo "✅ ${LEVEL_NAME} Git 用户已更新!"
echo ""
echo "新配置:"
echo "  用户名: $USERNAME"
echo "  邮箱:   $EMAIL"
echo ""

# 显示验证信息
echo "📝 提交时将使用以下信息:"
if [[ "$LEVEL" == "--local" ]]; then
    echo "  用户名: $(git config user.name)"
    echo "  邮箱:   $(git config user.email)"
else
    echo "  用户名: $(git config --global user.name)"
    echo "  邮箱:   $(git config --global user.email)"
fi
echo ""

# 提示查看所有配置
echo "💡 提示:"
echo "  查看所有配置: git config --list"
echo "  查看全局配置: git config --global --list"
echo "  查看项目配置: git config --local --list"
