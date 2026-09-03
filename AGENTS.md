# Repository Guidelines

## 项目结构与模块组织

`/Users/chances/workspace/eng_prod/ai-android/cli` 是 `@chancestv/create-android-shell` npm 脚手架，入口在 `/Users/chances/workspace/eng_prod/ai-android/cli/index.js`，核心逻辑在 `/Users/chances/workspace/eng_prod/ai-android/cli/lib`，测试在 `/Users/chances/workspace/eng_prod/ai-android/cli/test`。

`/Users/chances/workspace/eng_prod/ai-android/template` 存放可运行模板：`/Users/chances/workspace/eng_prod/ai-android/template/android-shell` 是 Android WebView 壳，`/Users/chances/workspace/eng_prod/ai-android/template/h5-vue` 是 Vue3 + Vite H5 工作区，`/Users/chances/workspace/eng_prod/ai-android/template/bridge-contract.md` 是壳与 H5 的 JSBridge 契约。`/Users/chances/workspace/eng_prod/ai-android/claude` 只放 AI rules/skills，无运行代码；`/Users/chances/workspace/eng_prod/ai-android/docs/superpowers` 放设计和计划文档。

H5 源码集中在 `/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/apps/shell/src`、`/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/packages/core/src`、`/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/packages/features/*/src`；TV 焦点与 UI 组件用已发布的 `@chancestv/tv-ui`（内部依赖 `@chancestv/tv-focus`，业务禁止直连）；写 TV 页 / 弹框 / 列表必须先用 skill `tv-ui-page-author`（`/Users/chances/workspace/eng_prod/ai-android/claude/skills/tv-ui-page-author/SKILL.md`）。资源放在 `/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/apps/shell/public` 和 `/Users/chances/workspace/eng_prod/ai-android/template/android-shell/app/src/main/res`。

## 构建、测试与开发命令

- `cd /Users/chances/workspace/eng_prod/ai-android/cli && npm test`：运行 CLI 的 Node 内置测试。
- `cd /Users/chances/workspace/eng_prod/ai-android/cli && npm link`：本地挂载脚手架命令 `create-android-shell`。
- `cd /Users/chances/workspace/eng_prod/ai-android/template/h5-vue && pnpm dev`：启动 H5 Vite 开发服务，默认地址 `http://localhost:5173/app/`。
- `cd /Users/chances/workspace/eng_prod/ai-android/template/h5-vue && pnpm install && pnpm build`：安装并构建 H5 模板。
- `cd /Users/chances/workspace/eng_prod/ai-android/template/h5-vue && pnpm lint && pnpm typecheck`：检查 H5 ESLint 与 TypeScript。
- `cd /Users/chances/workspace/eng_prod/ai-android/template/h5-vue && pnpm --filter @shell/core test`：运行 H5 core 的 Vitest 测试。
- `cd /Users/chances/workspace/eng_prod/ai-android/template/android-shell && JAVA_HOME=<jdk1.8> ./gradlew :app:assembleStagingDebug`：验证 Android 壳；需要 Android SDK 28、JDK 8、公司内网 Maven。

## 编码风格与命名约定

CLI 使用 CommonJS、2 空格缩进，优先复用 `/Users/chances/workspace/eng_prod/ai-android/cli/lib` 的小函数。Vue/TypeScript 遵循 `/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/apps/shell/eslint.config.ts`；业务模板禁止裸 `button`、`a`、`input`、`tabindex`、`@click`，使用 `@chancestv/tv-ui` 的 `EButton`、`EFocusable`、`EPage` 等组件和 `@enter`。Android 保持 Support 27.1.1、AGP 3.6.0、compileSdk 28，禁止 AndroidX；模块命名沿用 `feature_voice/<vendor>`、`lib_base`。

## 测试指南

CLI 测试命名为 `/Users/chances/workspace/eng_prod/ai-android/cli/test/*.test.js`，使用 `node:test` 与 `node:assert`。H5 核心测试命名为 `/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/packages/*/test/*.test.ts`，使用 Vitest，重点覆盖焦点导航、桥接和模板约束。修改生成流程、模板结构、焦点行为时必须补充或更新对应测试。

## 提交与 Pull Request 指南

提交信息使用 `type(scope): 中文说明`，如 `feat(cli): 集成语音配置`、`fix(core/focus): 修正方向键导航`、`refactor(rules): 精简 Vue 规则`。PR 需说明目的、影响目录、验证命令；涉及 UI 时附截图，涉及规则或模板时链接来源文档或下游需求。当前未配置 PR 模板，描述必须自包含。

## 安全与配置

`/Users/chances/workspace/eng_prod/ai-android/template/android-shell/app/shell.jks` 仅为 demo keystore，生产项目必须替换。真实语音密钥不要提交到 `/Users/chances/workspace/eng_prod/ai-android/template/android-shell/gradle.properties`，使用 `/Users/chances/.gradle/gradle.properties` 或 CI 凭据覆盖。不要创建 `/Users/chances/workspace/eng_prod/ai-android/README.md`；根说明以 `/Users/chances/workspace/eng_prod/ai-android/CLAUDE.md` 与本文件为准。

## Agent-Specific Instructions

自动化代理回复使用中文；报告文件路径、服务地址、连接串时必须写完整值。改动保持最小范围，优先遵循 `/Users/chances/workspace/eng_prod/ai-android/CLAUDE.md` 和现有模板约定。

<!-- DWY-RULES:START 由 dwy codex sync 生成，请勿手动编辑此区块 -->

<!-- dwy-rule: dwy-git-commit-safe.md -->

## [dwy] git commit message 安全写法(防反引号被 shell 命令替换误执行)

## 核心风险

AI 生成的 commit message 爱用 Markdown 风格反引号包代码标识符。经 shell 执行 `git commit -m "..."` 时，**双引号内**的反引号会被当成命令替换实际执行：

```bash
# 危险：`bun install` 被 shell 当成 $(bun install) 执行
git commit -m "fix: support `bun install` on windows"
```

shell 实际跑了 `bun install`，把输出塞进 message，甚至误执行破坏性命令导致丢代码。`$(...)` 同理。

## 强制规则

commit message 含反引号 `` ` `` / `$(...)` / 多行 / emoji 等特殊字符时，**禁止** `git commit -m "..."`，必须走以下安全写法：

### 1. 文件提交（首选，多行 / 特殊字符一律用它）

```bash
git commit -F <msg-file>

# 或 stdin
printf '%s\n' "$MSG" | git commit --file=-

# 或 heredoc 写文件再提交
cat > /tmp/commit-msg.txt <<'EOF'
feat(agent): add `runConcurrent`

- support drain-all-before-throw
EOF
git commit -F /tmp/commit-msg.txt
```

### 2. 单引号包裹（单行、无单引号时可用）

```bash
# 单引号内所有字符字面，反引号原样保留
git commit -m 'fix: support `bun install` on windows'
```

### 3. 转义反引号（不推荐，易漏）

```bash
git commit -m "fix: support \`bun install\` on windows"
```

## 安全速查

| 方式 | 反引号风险 |
|---|---|
| `git commit -m "...`...`..."` | 危险（双引号内被求值） |
| `git commit -m '...`...`...'` | 安全（单引号不展开） |
| `git commit -F <file>` | 安全（Git 直读文件，不过 shell） |
| `git commit --file=-` | 安全 |

## 禁止

- **禁止**把含反引号 / `$(...)` 的 message 拼进 `git commit -m "..."` 双引号
- **禁止**为图省事忽略此约束 —— 误执行后果是丢代码，不可逆

> PreToolUse hook `pre-git-commit-backtick-check.sh` 会在双引号 message 含未转义反引号 / `$(...)` 时硬拦截（exit 2），但 hook 是兜底，写法本身就该走安全方式。

<!-- DWY-RULES:END -->
