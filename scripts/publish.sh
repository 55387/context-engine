#!/bin/bash

# NPM 发布辅助脚本
# 用于简化发布流程

set -e  # 遇到错误立即退出

echo "🚀 Context Engine NPM 发布流程"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查 npm 登录状态
echo "📝 检查 npm 登录状态..."
if npm whoami &> /dev/null; then
    USERNAME=$(npm whoami)
    echo -e "${GREEN}✓${NC} 已登录，用户名: $USERNAME"
else
    echo -e "${RED}✗${NC} 未登录到 npm"
    echo "请先运行发布前准备脚本"
    exit 1
fi

# 2. 检查 git 状态
echo ""
echo "📝 检查 git 状态..."
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠${NC} 有未提交的更改:"
    git status -s
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Git 工作目录干净"
fi

# 3. 运行测试
echo ""
echo "🧪 运行测试..."
if npm test; then
    echo -e "${GREEN}✓${NC} 测试通过"
else
    echo -e "${RED}✗${NC} 测试失败"
    exit 1
fi

# 4. 构建项目
echo ""
echo "🔨 构建项目..."
if npm run build; then
    echo -e "${GREEN}✓${NC} 构建成功"
else
    echo -e "${RED}✗${NC} 构建失败"
    exit 1
fi

# 5. 询问版本类型
echo ""
echo "📦 当前版本: $(node -p "require('./package.json').version")"
echo "请选择版本更新类型:"
echo "  1) patch (bug修复, 1.0.0 -> 1.0.1)"
echo "  2) minor (新功能, 1.0.0 -> 1.1.0)"
echo "  3) major (破坏性变更, 1.0.0 -> 2.0.0)"
echo "  4) 跳过版本更新"
read -p "选择 (1-4): " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        npm version patch
        ;;
    2)
        npm version minor
        ;;
    3)
        npm version major
        ;;
    4)
        echo "跳过版本更新"
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}新版本: $NEW_VERSION${NC}"

# 6. 预览打包内容
echo ""
echo "📋 预览打包内容..."
npm pack --dry-run | tail -10

# 7. 确认发布
echo ""
echo -e "${YELLOW}准备发布版本 $NEW_VERSION${NC}"
read -p "确认发布到 npm? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消发布"
    exit 1
fi

# 8. 发布
echo ""
echo "📤 发布到 npm..."
if npm publish --access public; then
    echo -e "${GREEN}✓${NC} 发布成功！"
    echo ""
    echo "🎉 版本 $NEW_VERSION 已成功发布到 npm"
    echo "📦 查看: https://www.npmjs.com/package/@link/context-engine"
    
    # 9. 推送到 git
    echo ""
    read -p "是否推送标签到 Git? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        git push --tags
        echo -e "${GREEN}✓${NC} 已推送到 Git"
    fi
else
    echo -e "${RED}✗${NC} 发布失败"
    exit 1
fi

echo ""
echo "✨ 完成！"
