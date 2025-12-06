# NPM 发布指南

## 准备工作

### 1. 配置 npm 账号

如果还没有 npm 账号，需要先注册：
```bash
npm adduser
```

或者登录已有账号：
```bash
npm login
```

验证登录状态：
```bash
npm whoami
```

### 2. 更新包名（可选）

如果想要发布为组织包或公开包，需要修改 `package.json` 中的 `name` 字段：

- **公开包**：`"name": "context-engine"`
- **组织包**：`"name": "@your-org/context-engine"`

⚠️ **注意**：组织包默认是私有的，需要添加发布配置：
```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### 3. 添加 LICENSE 文件

创建 `LICENSE` 文件（推荐使用 MIT 许可证）：

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## 发布步骤

### 1. 确保代码质量

运行测试和类型检查：
```bash
npm test
npm run lint
```

### 2. 构建项目

```bash
npm run build
```

这会执行：
- 清理旧的 dist 目录
- 编译 TypeScript 代码
- 生成类型声明文件

### 3. 检查打包内容

使用 `npm pack --dry-run` 查看将要发布的文件：
```bash
npm pack --dry-run
```

或者实际打包查看：
```bash
npm pack
tar -tzf link-context-engine-1.0.0.tgz
```

### 4. 更新版本号

根据语义化版本规范更新版本：

```bash
# 补丁版本 (1.0.0 -> 1.0.1) - 修复bug
npm version patch

# 次版本 (1.0.0 -> 1.1.0) - 新功能，向后兼容
npm version minor

# 主版本 (1.0.0 -> 2.0.0) - 破坏性变更
npm version major
```

或者手动修改 `package.json` 中的 `version` 字段。

### 5. 发布到 npm

```bash
# 发布到 npm registry
npm publish

# 如果是组织包，需要指定 public
npm publish --access public
```

### 6. 添加 Git 标签（推荐）

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 测试发布的包

发布后，可以在另一个项目中测试安装：

```bash
# 创建测试目录
mkdir test-context-engine
cd test-context-engine
npm init -y

# 安装你发布的包
npm install @55387.ai/context-engine

# 测试导入
node -e "const { ContextEngine } = require('@55387.ai/context-engine'); console.log('✅ 导入成功');"
```

## 使用 CLI 工具

安装后，可以全局使用 CLI：

```bash
# 全局安装
npm install -g @55387.ai/context-engine

# 使用 CLI
context-engine --help
context-engine chat -u alice
```

或者在项目中使用：

```bash
npx @55387.ai/context-engine chat -u alice
```

## 更新已发布的包

1. 修改代码
2. 更新版本号：`npm version patch`（或 minor/major）
3. 重新构建：`npm run build`
4. 重新发布：`npm publish`

## 撤销发布（谨慎使用）

⚠️ **警告**：撤销发布可能影响依赖你包的其他项目！

```bash
# 撤销特定版本（发布后24小时内）
npm unpublish @55387.ai/context-engine@1.0.0

# 撤销整个包（极不推荐）
npm unpublish @55387.ai/context-engine --force
```

## Beta 版本发布

发布测试版本，不影响 latest 标签：

```bash
# 更新为 beta 版本
npm version 1.1.0-beta.0

# 发布为 beta 标签
npm publish --tag beta

# 用户安装 beta 版本
npm install @55387.ai/context-engine@beta
```

## CI/CD 自动发布（可选）

在 `.github/workflows/publish.yml` 中配置：

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## 常见问题

### 1. 包名已被占用

错误：`403 Forbidden - PUT https://registry.npmjs.org/@link%2fcontext-engine - Package name too similar to existing package`

**解决**：更换包名，使用更独特的名称。

### 2. 需要身份验证

错误：`401 Unauthorized - PUT https://registry.npmjs.org/@link%2fcontext-engine`

**解决**：运行 `npm login` 重新登录。

### 3. TypeScript 类型未生成

确保 `tsconfig.json` 中设置了：
```json
{
  "declaration": true,
  "declarationMap": true
}
```

### 4. CLI 命令无法执行

确保：
1. `package.json` 中有正确的 `bin` 配置
2. CLI 文件顶部有 `#!/usr/bin/env node`
3. 编译后的文件有执行权限（npm publish 会自动处理）

## 最佳实践

1. **语义化版本**：严格遵循 [SemVer](https://semver.org/)
2. **变更日志**：维护 `CHANGELOG.md` 记录每个版本的变更
3. **README**：提供清晰的安装和使用说明
4. **测试覆盖**：确保高测试覆盖率
5. **文档**：提供完整的 API 文档
6. **TypeScript 类型**：确保类型定义完整且正确
7. **向后兼容**：尽量保持 API 向后兼容
8. **依赖管理**：定期更新依赖，修复安全漏洞

## 参考资源

- [npm 官方文档](https://docs.npmjs.com/)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [npm 包发布最佳实践](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
