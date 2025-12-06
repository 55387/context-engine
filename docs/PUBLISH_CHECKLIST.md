# NPM 发布清单

在发布之前，请确认以下所有项目：

## ✅ 代码质量

- [ ] 所有测试通过: `npm test`
- [ ] 代码通过 linter 检查: `npm run lint`
- [ ] 构建成功: `npm run build`
- [ ] TypeScript 类型检查通过（无错误）

## ✅ 文档

- [ ] README.md 已更新并准确
- [ ] CHANGELOG.md 已更新，记录了新版本的变更
- [ ] API 文档完整且最新
- [ ] 示例代码可运行且准确

## ✅ 包配置

- [ ] package.json 中的版本号已更新
- [ ] package.json 中的 name、description、keywords 准确
- [ ] package.json 中的 repository、bugs、homepage URL 正确
- [ ] package.json 中的 author 信息完整
- [ ] package.json 中的 files 字段包含所有必要文件
- [ ] package.json 中的 main 和 types 字段指向正确的文件

## ✅ 依赖项

- [ ] dependencies 只包含运行时必需的包
- [ ] devDependencies 包含所有开发工具
- [ ] 没有未使用的依赖项
- [ ] 依赖版本号合理（使用 ^ 或 ~ 前缀）

## ✅ 文件和目录

- [ ] LICENSE 文件存在
- [ ] .npmignore 配置正确，不包含不必要的文件
- [ ] dist 目录已生成，包含编译后的代码
- [ ] dist 目录中的 .d.ts 类型文件存在

## ✅ CLI（如果适用）

- [ ] bin 字段配置正确
- [ ] CLI 文件有正确的 shebang (`#!/usr/bin/env node`)
- [ ] CLI 命令可以正常执行
- [ ] CLI 帮助信息清晰完整

## ✅ 安全和隐私

- [ ] 代码中没有硬编码的密钥或敏感信息
- [ ] .env 文件未包含在发布包中
- [ ] 没有暴露用户数据或隐私信息

## ✅ Git

- [ ] 所有变更已提交到 Git
- [ ] 没有未跟踪的重要文件
- [ ] 分支是最新的（已 push 到远程）

## ✅ npm 账户

- [ ] 已登录 npm: `npm whoami`
- [ ] 有权限发布该包（如果是组织包）
- [ ] 包名未被占用（首次发布时）

## ✅ 测试发布

- [ ] 运行 `npm pack --dry-run` 检查打包内容
- [ ] 或运行 `npm pack` 并解压查看实际内容
- [ ] 打包文件大小合理（< 1MB 为佳）

## ✅ 版本策略

根据 [语义化版本](https://semver.org/) 规范选择版本号：

- [ ] **补丁版本** (x.x.1): 仅修复 bug，向后兼容
- [ ] **次版本** (x.1.x): 添加新功能，向后兼容
- [ ] **主版本** (1.x.x): 破坏性变更，不向后兼容

## ✅ 发布前最后检查

```bash
# 1. 清理并重新构建
npm run clean
npm install
npm run build

# 2. 运行完整测试套件
npm test

# 3. 检查打包内容
npm pack --dry-run

# 4. 更新版本（如果还没更新）
npm version [patch|minor|major]

# 5. 发布
npm publish --dry-run  # 先预览
npm publish            # 正式发布
```

## 发布后

- [ ] 验证包在 npm 上可见: https://www.npmjs.com/package/@55387.ai/context-engine
- [ ] 在新项目中测试安装: `npm install @55387.ai/context-engine`
- [ ] 创建 Git tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] 在 GitHub 上创建 Release
- [ ] 更新项目文档网站（如果有）
- [ ] 通知用户或在社交媒体上宣布

## 回滚计划

如果发布后发现严重问题：

1. 在 24 小时内可以撤销发布: `npm unpublish @55387.ai/context-engine@version`
2. 或发布修复版本: `npm version patch && npm publish`

---

**记住**: 一旦发布，就无法修改该版本的代码。确保在发布前仔细检查！
