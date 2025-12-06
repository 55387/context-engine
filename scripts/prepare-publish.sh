#!/bin/bash

# NPM 发布前准备脚本
# 确保环境配置正确

set -e

echo "🔧 NPM 发布准备"
echo "================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 检查 registry
echo "1️⃣  检查 npm registry..."
CURRENT_REGISTRY=$(npm config get registry)
OFFICIAL_REGISTRY="https://registry.npmjs.org/"

if [ "$CURRENT_REGISTRY" != "$OFFICIAL_REGISTRY" ]; then
    echo -e "${YELLOW}⚠${NC}  当前 registry: $CURRENT_REGISTRY"
    echo -e "${BLUE}→${NC}  切换到官方 registry..."
    npm config set registry $OFFICIAL_REGISTRY
    echo -e "${GREEN}✓${NC}  已切换到: $OFFICIAL_REGISTRY"
else
    echo -e "${GREEN}✓${NC}  Registry 正确: $OFFICIAL_REGISTRY"
fi

# 2. 检查 npm 登录状态
echo ""
echo "2️⃣  检查 npm 登录状态..."
if npm whoami &> /dev/null; then
    USERNAME=$(npm whoami)
    echo -e "${GREEN}✓${NC}  已登录: $USERNAME"
else
    echo -e "${YELLOW}⚠${NC}  未登录到 npm"
    echo ""
    echo "请按 ENTER 键打开浏览器登录，或按 Ctrl+C 取消"
    read -p "准备好了吗？按 ENTER 继续..."
    
    if npm login; then
        USERNAME=$(npm whoami)
        echo -e "${GREEN}✓${NC}  登录成功: $USERNAME"
    else
        echo -e "${RED}✗${NC}  登录失败"
        exit 1
    fi
fi

# 3. 检查包名是否可用（仅首次发布）
echo ""
echo "3️⃣  检查包信息..."
PACKAGE_NAME=$(node -p "require('./package.json').name")
echo "   包名: $PACKAGE_NAME"

# 尝试获取包信息
if npm view $PACKAGE_NAME version &> /dev/null; then
    PUBLISHED_VERSION=$(npm view $PACKAGE_NAME version)
    echo -e "${BLUE}ℹ${NC}  包已存在，当前版本: $PUBLISHED_VERSION"
    LOCAL_VERSION=$(node -p "require('./package.json').version")
    echo "   本地版本: $LOCAL_VERSION"
    
    if [ "$PUBLISHED_VERSION" == "$LOCAL_VERSION" ]; then
        echo -e "${YELLOW}⚠${NC}  版本号相同，发布前需要更新版本号"
    fi
else
    echo -e "${GREEN}✓${NC}  包名可用（首次发布）"
fi

# 4. 验证构建
echo ""
echo "4️⃣  验证构建..."
if [ -d "dist" ]; then
    FILE_COUNT=$(find dist -type f | wc -l)
    echo -e "${GREEN}✓${NC}  dist 目录存在 ($FILE_COUNT 个文件)"
else
    echo -e "${YELLOW}⚠${NC}  dist 目录不存在，运行构建..."
    npm run build
    echo -e "${GREEN}✓${NC}  构建完成"
fi

# 5. 显示发布信息
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ 准备就绪！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 包信息:"
echo "   名称: $PACKAGE_NAME"
echo "   版本: $(node -p "require('./package.json').version")"
echo "   Registry: $OFFICIAL_REGISTRY"
echo "   用户: $USERNAME"
echo ""
echo "🚀 下一步:"
echo "   运行 './scripts/publish.sh' 开始发布流程"
echo "   或运行 'npm publish --access public' 手动发布"
echo ""

# 6. 提示：发布后如何恢复镜像源
echo "💡 提示:"
echo "   发布完成后，如果需要恢复淘宝镜像源，运行:"
echo "   npm config set registry https://registry.npmmirror.com"
echo ""
