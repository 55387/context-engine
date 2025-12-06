# 快速发布指南

## 🎯 简化发布流程（推荐）

### 方法 1: 使用自动化脚本

```bash
# 1. 准备环境（切换 registry、登录 npm）
./scripts/prepare-publish.sh

# 2. 发布（自动测试、构建、更新版本、发布）
./scripts/publish.sh
```

### 方法 2: 手动发布

#### 步骤 1: 切换到官方 npm registry

```bash
# 检查当前 registry
npm config get registry

# 如果不是官方源，切换到官方源
npm config set registry https://registry.npmjs.org/

# 验证
npm config get registry
# 应该输出: https://registry.npmjs.org/
```

#### 步骤 2: 登录 npm

```bash
npm login
```

这会打开浏览器让你登录。登录步骤：
1. 浏览器会自动打开到 npm 登录页面
2. 输入用户名和密码
3. 完成双因素认证（如果启用）
4. 返回终端，应该看到登录成功

验证登录：
```bash
npm whoami
# 应该显示你的用户名
```

#### 步骤 3: 更新版本号

```bash
# 根据变更类型选择
npm version patch   # 1.0.0 -> 1.0.1 (bug 修复)
npm version minor   # 1.0.0 -> 1.1.0 (新功能)
npm version major   # 1.0.0 -> 2.0.0 (破坏性变更)
```

#### 步骤 4: 构建和测试

```bash
npm run build
npm test
```

#### 步骤 5: 预览发布内容

```bash
npm pack --dry-run
```

检查输出，确保没有包含不应该发布的文件。

#### 步骤 6: 发布

```bash
# 组织包需要指定 --access public
npm publish --access public

# 或者普通包
npm publish
```

#### 步骤 7: 验证发布

```bash
# 在浏览器中查看
open https://www.npmjs.com/package/@55387.ai/context-engine

# 或使用命令查看
npm view @55387.ai/context-engine
```

#### 步骤 8: 推送到 Git

```bash
git push
git push --tags
```

#### 步骤 9: 恢复镜像源（可选）

发布完成后，如果平时使用淘宝镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

## 🔧 故障排除

### 问题 1: "npm login" 连接到错误的 registry

**原因**: npm registry 配置指向了镜像源

**解决**:
```bash
npm config set registry https://registry.npmjs.org/
npm login
```

### 问题 2: 登录时浏览器没有自动打开

**解决**:
1. 手动复制终端显示的 URL
2. 在浏览器中打开该 URL
3. 完成登录
4. 返回终端按 Enter

### 问题 3: "You do not have permission to publish"

**可能原因**:
- 包名已被占用
- 不是组织成员
- 需要使用 `--access public`

**解决**:
```bash
# 如果是组织包，需要指定 public 访问
npm publish --access public

# 或者更换包名
# 修改 package.json 中的 name 字段
```

### 问题 4: "version already exists"

**原因**: 当前版本号已经发布过

**解决**:
```bash
# 更新版本号
npm version patch
npm publish --access public
```

### 问题 5: 构建失败

**解决**:
```bash
# 清理并重新构建
npm run clean
npm install
npm run build
```

## 📋 发布前检查清单

- [ ] 代码已提交到 Git
- [ ] 测试通过 (`npm test`)
- [ ] 构建成功 (`npm run build`)
- [ ] CHANGELOG.md 已更新
- [ ] README.md 准确无误
- [ ] 版本号已更新
- [ ] npm registry 切换到官方源
- [ ] 已登录 npm (`npm whoami`)

## 🎯 首次发布特别注意

### 1. 包名选择

确保包名未被占用：
```bash
npm view @55387.ai/context-engine
# 如果返回 404，说明可用
```

### 2. 组织包发布

如果使用 `@组织名/包名` 格式：
- 必须是该组织的成员
- 默认是私有的，需要付费或使用 `--access public`

### 3. .npmrc 配置（可选）

在项目根目录创建 `.npmrc`：
```
@link:registry=https://registry.npmjs.org/
access=public
```

这样每次发布都会使用正确的配置。

## 🚀 测试已发布的包

发布后立即测试：

```bash
# 创建测试目录
mkdir /tmp/test-context-engine
cd /tmp/test-context-engine

# 初始化项目
npm init -y

# 安装你的包
npm install @55387.ai/context-engine

# 测试导入
node -e "const { ContextEngine } = require('@55387.ai/context-engine'); console.log('✅ 成功');"

# 测试 CLI
npx @55387.ai/context-engine --help
```

## 📚 更多信息

- [完整发布指南](./NPM_PUBLISH_GUIDE.md)
- [发布检查清单](./PUBLISH_CHECKLIST.md)
- [包配置总结](./NPM_PACKAGE_SUMMARY.md)

---

**提示**: 首次发布建议使用手动流程，熟悉后可以使用自动化脚本。
