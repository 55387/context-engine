# 版本号管理指南

## 📌 语义化版本规范（SemVer）

版本号格式：`MAJOR.MINOR.PATCH`（主版本号.次版本号.补丁版本号）

### 版本号规则

```
版本号：1.2.3
       │ │ │
       │ │ └─ PATCH：向后兼容的 bug 修复
       │ └─── MINOR：向后兼容的新功能
       └───── MAJOR：不向后兼容的破坏性变更
```

### 更新时机

| 类型 | 何时使用 | 命令 | 示例 |
|------|---------|------|------|
| **Patch** | 修复 bug | `npm version patch` | 1.0.0 → 1.0.1 |
| **Minor** | 新增功能（向后兼容） | `npm version minor` | 1.0.0 → 1.1.0 |
| **Major** | 破坏性变更 | `npm version major` | 1.0.0 → 2.0.0 |

## 🔄 版本管理流程

### 标准流程

```bash
# 1. 完成代码修改
git add .
git commit -m "feat: add new feature"

# 2. 更新版本号（自动创建 commit 和 tag）
npm version minor

# 3. 推送到 Git
git push
git push --tags

# 4. 发布到 npm
npm publish --access public
```

### 首次发布

首次发布建议使用 `1.0.0`：

```bash
# 如果版本号不是 1.0.0，手动修改 package.json
# 或使用命令重置：
npm version 1.0.0 --no-git-tag-version

# 发布
npm publish --access public
```

## 📋 版本更新示例

### Patch 更新（1.0.0 → 1.0.1）

**场景**：修复 bug，向后兼容

```bash
# 修复了一个内存泄漏问题
git commit -m "fix: memory leak in session manager"
npm version patch
npm publish
```

**用户影响**：可以直接升级，无需改代码

### Minor 更新（1.0.0 → 1.1.0）

**场景**：添加新功能，向后兼容

```bash
# 添加了新的存储后端
git commit -m "feat: add Redis storage backend"
npm version minor
npm publish
```

**用户影响**：可以直接升级，旧代码继续工作，可选使用新功能

### Major 更新（1.0.0 → 2.0.0）

**场景**：破坏性变更，不向后兼容

```bash
# 重构了 API 接口
git commit -m "BREAKING CHANGE: redesign session API"
npm version major
npm publish
```

**用户影响**：升级需要修改代码，查看迁移指南

## 🏷️ 预发布版本

### Beta 版本

用于测试新功能：

```bash
# 创建 beta 版本
npm version 1.1.0-beta.0

# 发布到 beta 标签
npm publish --tag beta

# 用户安装 beta 版本
npm install @55387.ai/context-engine@beta
```

### Alpha 版本

用于早期测试：

```bash
npm version 1.1.0-alpha.0
npm publish --tag alpha
```

## 📊 版本历史示例

```
1.0.0   ← 首次发布
1.0.1   ← 修复 bug
1.0.2   ← 修复另一个 bug
1.1.0   ← 添加新功能
1.1.1   ← 修复新功能的 bug
1.2.0   ← 添加另一个新功能
2.0.0   ← 重大重构，API 不兼容
2.0.1   ← 修复重构后的 bug
2.1.0   ← 基于新架构添加功能
```

## 🛠️ 实用命令

### 查看当前版本

```bash
npm version
# 或
node -p "require('./package.json').version"
```

### 手动更新版本（不创建 git tag）

```bash
npm version 1.2.3 --no-git-tag-version
```

### 查看包的所有版本

```bash
npm view @55387.ai/context-engine versions
```

### 撤销版本更新

```bash
# 如果还没有 push
git reset --hard HEAD~1
git tag -d v1.2.3

# 如果已经 push
git push origin :refs/tags/v1.2.3
git tag -d v1.2.3
```

## 📝 最佳实践

### 1. 遵循 SemVer 规范

- **严格遵守**语义化版本规范
- **PATCH**：只做 bug 修复
- **MINOR**：添加功能但不破坏现有 API
- **MAJOR**：只在必要时进行破坏性变更

### 2. 配合 Git 使用

```bash
# 推荐在 package.json 中配置
{
  "scripts": {
    "release:patch": "npm version patch && git push && git push --tags && npm publish",
    "release:minor": "npm version minor && git push && git push --tags && npm publish",
    "release:major": "npm version major && git push && git push --tags && npm publish"
  }
}
```

使用：
```bash
npm run release:patch
```

### 3. 维护 CHANGELOG

每次版本更新都应该更新 `CHANGELOG.md`：

```markdown
## [1.1.0] - 2025-12-06

### Added
- 新增 Redis 存储后端
- 新增批量操作 API

### Fixed
- 修复会话过期问题

## [1.0.1] - 2025-12-05

### Fixed
- 修复内存泄漏问题
```

### 4. 使用 Conventional Commits

提交信息使用标准格式：

```bash
feat: 新功能
fix: bug 修复
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
BREAKING CHANGE: 破坏性变更
```

### 5. 预发布测试

重大更新前先发布 beta 版本：

```bash
# 发布 beta 测试
npm version 2.0.0-beta.0
npm publish --tag beta

# 测试稳定后发布正式版
npm version 2.0.0
npm publish
```

## 🚨 常见错误

### ❌ 错误 1：破坏性变更只更新 MINOR

```bash
# 错误示例
npm version minor  # API 变了但只升级 minor
```

**正确做法**：
```bash
npm version major  # 破坏性变更必须升级 major
```

### ❌ 错误 2：新功能只更新 PATCH

```bash
# 错误示例
npm version patch  # 添加了新功能但只升级 patch
```

**正确做法**：
```bash
npm version minor  # 新功能应该升级 minor
```

### ❌ 错误 3：跳跃版本号

```bash
# 不推荐
npm version 1.5.0  # 从 1.2.0 直接跳到 1.5.0
```

**推荐做法**：按顺序递增

## 🎯 当前项目建议

您的项目当前是**首次发布**，建议：

1. **版本号**：使用 `1.0.0`（已帮您改回）
2. **发布后**：
   - 小修复：`npm version patch` → 1.0.1
   - 新功能：`npm version minor` → 1.1.0
   - 重大变更：`npm version major` → 2.0.0

3. **配置自动化**：
```json
{
  "scripts": {
    "release": "npm run build && npm test && npm publish"
  }
}
```

---

**参考资源**：
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [npm version 文档](https://docs.npmjs.com/cli/v8/commands/npm-version)
