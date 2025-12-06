# Git 和 GitHub 提交指南

## 🚀 快速提交到 GitHub

### 方法 1: 使用自动化脚本（推荐）

```bash
./scripts/git-push.sh
```

脚本会自动：
1. 检查未提交的更改
2. 添加文件到 Git
3. 提交更改
4. 配置远程仓库（如果需要）
5. 推送到 GitHub

### 方法 2: 手动操作

#### 步骤 1: 初始化 Git（已完成）✅

```bash
git init
```

#### 步骤 2: 添加文件

```bash
# 添加所有文件
git add .

# 或添加特定文件
git add package.json README.md
```

#### 步骤 3: 提交更改

```bash
git commit -m "feat: initial commit - Context Engine"
```

#### 步骤 4: 连接 GitHub 仓库

首先，在 GitHub 上创建一个新仓库：
- 访问 https://github.com/new
- 仓库名建议: `context-engine`
- 选择 Public 或 Private
- **不要**勾选 "Initialize with README"（因为本地已有文件）

然后连接远程仓库：

```bash
# 使用 HTTPS
git remote add origin https://github.com/你的用户名/context-engine.git

# 或使用 SSH
git remote add origin git@github.com:你的用户名/context-engine.git
```

#### 步骤 5: 推送到 GitHub

```bash
# 首次推送（创建 main 分支）
git branch -M main
git push -u origin main

# 后续推送
git push
```

## 📝 常用 Git 命令

### 查看状态

```bash
# 查看当前状态
git status

# 简洁显示
git status -s
```

### 提交更改

```bash
# 标准流程
git add .
git commit -m "提交信息"
git push
```

### 查看历史

```bash
# 查看提交历史
git log --oneline

# 查看最近 5 次提交
git log -5
```

### 分支操作

```bash
# 查看所有分支
git branch -a

# 创建新分支
git checkout -b feature/new-feature

# 切换分支
git checkout main
```

### 远程仓库

```bash
# 查看远程仓库
git remote -v

# 修改远程仓库地址
git remote set-url origin 新的地址

# 删除远程仓库
git remote remove origin
```

## 🔧 提交信息规范

使用 Conventional Commits 格式：

```
<类型>(<范围>): <简短描述>

<详细描述>（可选）
```

### 常用类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更改
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 添加或修改测试
- `chore`: 构建/工具相关

### 示例

```bash
# 新功能
git commit -m "feat: add SQLite storage backend"

# Bug 修复
git commit -m "fix: resolve memory leak in session manager"

# 文档更新
git commit -m "docs: update README with installation guide"

# 重构
git commit -m "refactor: simplify memory consolidation logic"

# 重大变更
git commit -m "feat!: redesign session API

BREAKING CHANGE: Session.create() now requires userId parameter"
```

## 🌿 推荐工作流

### 功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/add-redis-storage

# 2. 开发并提交
git add .
git commit -m "feat: add Redis storage backend"

# 3. 推送分支
git push -u origin feature/add-redis-storage

# 4. 在 GitHub 上创建 Pull Request

# 5. 合并后删除分支
git checkout main
git pull
git branch -d feature/add-redis-storage
```

### 发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 推送代码和标签
git push
git push --tags

# 3. 发布到 npm
npm publish --access public

# 4. 在 GitHub 上创建 Release
```

## 🚨 常见问题

### Q: 如何撤销最后一次提交？

```bash
# 保留更改，撤销提交
git reset --soft HEAD~1

# 放弃更改，撤销提交
git reset --hard HEAD~1
```

### Q: 如何修改最后一次提交信息？

```bash
git commit --amend -m "新的提交信息"

# 如果已推送，需要强制推送
git push --force
```

### Q: 如何忽略文件？

编辑 `.gitignore` 文件：

```
# Node.js
node_modules/
dist/

# 环境变量
.env
.env*.local

# 数据文件
data/
```

### Q: 如何查看文件变更？

```bash
# 查看未暂存的更改
git diff

# 查看已暂存的更改
git diff --staged

# 查看特定文件的更改
git diff README.md
```

### Q: 推送被拒绝怎么办？

```bash
# 先拉取远程更改
git pull

# 解决冲突后再推送
git push
```

## 📚 有用的别名

在 `~/.gitconfig` 中添加：

```ini
[alias]
    st = status -s
    co = checkout
    br = branch
    cm = commit -m
    lg = log --oneline --graph --all --decorate
    last = log -1 HEAD
    unstage = reset HEAD --
```

使用：
```bash
git st      # 等同于 git status -s
git co main # 等同于 git checkout main
git cm "message" # 等同于 git commit -m "message"
```

## 🔐 SSH 密钥设置

如果使用 SSH 推送，需要先配置 SSH 密钥：

```bash
# 1. 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub

# 3. 添加到 GitHub
# 访问 https://github.com/settings/keys
# 点击 "New SSH key"，粘贴公钥
```

---

**当前状态**:
- ✅ Git 仓库已初始化
- ✅ `.gitignore` 已创建
- ⏳ 等待连接 GitHub 仓库

**下一步**: 运行 `./scripts/git-push.sh` 或手动推送到 GitHub
