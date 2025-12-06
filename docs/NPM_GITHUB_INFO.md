# NPM 包 GitHub 信息配置指南

## 📦 package.json 中的 GitHub 字段

npm 包中的 GitHub 信息主要通过 `package.json` 中的以下字段配置：

### 1. repository（仓库地址）

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/55387/context-engine.git"
  }
}
```

或简写形式：
```json
{
  "repository": "github:55387/context-engine"
}
```

**作用**：
- npm 包页面会显示 GitHub 链接
- 用户可以直接查看源代码
- 支持 `npm repo` 命令快速打开仓库

### 2. bugs（问题追踪）

```json
{
  "bugs": {
    "url": "https://github.com/55387/context-engine/issues",
    "email": "support@55387.ai"  // 可选
  }
}
```

或简写：
```json
{
  "bugs": "https://github.com/55387/context-engine/issues"
}
```

**作用**：
- npm 包页面显示"Report a bug"链接
- 用户可以直接提交 issue

### 3. homepage（项目主页）

```json
{
  "homepage": "https://github.com/55387/context-engine#readme"
}
```

**作用**：
- npm 包页面显示项目主页链接
- 通常指向 README 或项目文档

### 4. author（作者信息）

```json
{
  "author": "55387 Team"
}
```

或详细格式：
```json
{
  "author": {
    "name": "55387 Team",
    "email": "lin8n4ai@gmail.com",
    "url": "https://55387.ai"
  }
}
```

## ✅ 当前配置（已更新）

您的 `package.json` 现在包含：

```json
{
  "name": "@55387.ai/context-engine",
  "version": "1.0.0",
  "author": "55387 Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/55387/context-engine.git"
  },
  "bugs": {
    "url": "https://github.com/55387/context-engine/issues"
  },
  "homepage": "https://github.com/55387/context-engine#readme"
}
```

## 🔍 验证配置

### 查看包信息

```bash
# 查看本地包信息
npm pkg get repository
npm pkg get bugs
npm pkg get homepage

# 发布后查看
npm view @55387.ai/context-engine repository
npm view @55387.ai/context-engine bugs
npm view @55387.ai/context-engine homepage
```

### 测试快捷命令

```bash
# 打开仓库（发布后）
npm repo @55387.ai/context-engine

# 打开 issues 页面
npm bugs @55387.ai/context-engine

# 打开主页
npm home @55387.ai/context-engine
```

## 📝 在 npm 网站上的显示

发布后，在 https://www.npmjs.com/package/@55387.ai/context-engine 上会显示：

1. **Right Sidebar**:
   - 📦 Repository 链接 → GitHub 仓库
   - 🐛 Issues 链接 → GitHub Issues
   - 🏠 Homepage 链接 → GitHub README

2. **README**: 自动从 GitHub 同步（如果有）

3. **Code Tab**: 链接到 GitHub 源码

## 🔄 更新 GitHub 信息的完整流程

### 1. 更新 package.json

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/新组织/新仓库.git"
  },
  "bugs": {
    "url": "https://github.com/新组织/新仓库/issues"
  },
  "homepage": "https://github.com/新组织/新仓库#readme"
}
```

### 2. 更新文档中的链接

```bash
# 批量替换文档中的 GitHub 链接
find . -name "*.md" -exec sed -i '' 's|旧链接|新链接|g' {} +
```

### 3. 更新 README badges

```markdown
[![Issues](https://img.shields.io/github/issues/55387/context-engine)](https://github.com/55387/context-engine/issues)
[![Stars](https://img.shields.io/github/stars/55387/context-engine)](https://github.com/55387/context-engine)
```

### 4. 提交更改

```bash
git add package.json README.md docs/
git commit -m "docs: update GitHub repository information"
```

### 5. 发布新版本

```bash
npm version patch
npm publish
git push --tags
```

## 🎨 额外的 npm 字段

### keywords（关键词）

```json
{
  "keywords": [
    "context-engineering",
    "llm",
    "ai",
    "memory",
    "session"
  ]
}
```

**作用**: 提高包的可发现性

### contributors（贡献者）

```json
{
  "contributors": [
    "Alice <alice@example.com>",
    "Bob <bob@example.com>"
  ]
}
```

### funding（资金支持）

```json
{
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/55387"
  }
}
```

或多个资金来源：
```json
{
  "funding": [
    {
      "type": "github",
      "url": "https://github.com/sponsors/55387"
    },
    {
      "type": "patreon",
      "url": "https://patreon.com/55387"
    }
  ]
}
```

## 🏷️ GitHub 相关的 npm 徽章

在 README.md 中添加：

```markdown
[![npm version](https://badge.fury.io/js/%4055387.ai%2Fcontext-engine.svg)](https://www.npmjs.com/package/@55387.ai/context-engine)
[![GitHub issues](https://img.shields.io/github/issues/55387/context-engine)](https://github.com/55387/context-engine/issues)
[![GitHub stars](https://img.shields.io/github/stars/55387/context-engine)](https://github.com/55387/context-engine/stargazers)
[![GitHub license](https://img.shields.io/github/license/55387/context-engine)](https://github.com/55387/context-engine/blob/main/LICENSE)
```

## ✨ 最佳实践

1. **保持一致性**: 确保 package.json、README、文档中的链接一致
2. **使用完整 URL**: 使用完整的 GitHub URL，不要使用短链接
3. **及时更新**: 仓库迁移后立即更新所有引用
4. **添加徽章**: 在 README 中添加相关徽章，提升专业性
5. **版本标签**: 每次发布都创建 git tag，便于追踪

## 🔗 相关命令

```bash
# 查看所有 npm 包元数据
npm pkg get

# 设置字段
npm pkg set repository.url="https://github.com/55387/context-engine.git"
npm pkg set bugs.url="https://github.com/55387/context-engine/issues"
npm pkg set homepage="https://github.com/55387/context-engine#readme"

# 删除字段
npm pkg delete funding
```

---

**当前状态**: ✅ GitHub 信息已更新为 `https://github.com/55387/context-engine`
