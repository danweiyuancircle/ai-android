# chances-tv-android 项目说明

本仓库是 Android WebView 壳 + H5 脚手架项目，包含：
- CLI 脚手架：`/Users/chances/workspace/eng_prod/chances-tv-android/cli`
- 模板集合：`/Users/chances/workspace/eng_prod/chances-tv-android/template`
- 工程约束与规则：`/Users/chances/workspace/eng_prod/chances-tv-android/claude`
- 发布与自动化：`.github/workflows`

## 一、项目目标

提供统一模板链路，快速生成 TV/OTT 场景可落地工程：
- Android 壳（Support 27.1.1 + AGP 3.6 + JDK 8）
- Vue3 H5 壳（`template/web`）
- 统一 JSBridge 契约（`template/bridge-contract.md`）
- 代码生成入口与参数（应用名、`applicationId`、图标、语音方案）

## 二、目录速览

- `/Users/chances/workspace/eng_prod/chances-tv-android/cli`
  - 脚手架入口：`index.js`
  - 规则与核心实现：`lib/`、`stacks.js`
  - 发布说明：`cli/README.md`
  - 版本记录：`cli/CHANGELOG.md`
- `/Users/chances/workspace/eng_prod/chances-tv-android/template`
  - `template/android-app`：Android 壳模板
  - `template/web`：Vue3 H5 模板
  - `template/README.md`：模板结构说明
- `/Users/chances/workspace/eng_prod/chances-tv-android/docs`
  - 项目说明与扩展文档
- `/Users/chances/workspace/eng_prod/chances-tv-android/claude`
  - 团队规则与技能说明（不在 template 中冗余）
- `/.github/workflows/cli-release.yml`
  - GitHub Actions 触发发布配置（Tag 发布）

## 三、开发命令

CLI（本仓库核心脚手架模块）：

```bash
cd /Users/chances/workspace/eng_prod/chances-tv-android/cli
npm test
npm link
```

H5 模板：

```bash
cd /Users/chances/workspace/eng_prod/chances-tv-android/template/web
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm --filter @shell/core test
```

Android 壳：

```bash
cd /Users/chances/workspace/eng_prod/chances-tv-android/template/android-app
JAVA_HOME=<jdk1.8> ./gradlew :app:assembleStagingDebug
```

## 四、发布流程（CLI）

`cli/package.json` 的版本号与 `cli/package-lock.json` 版本必须同步。

```bash
cd /Users/chances/workspace/eng_prod/chances-tv-android
cd cli
npm version patch
cd /Users/chances/workspace/eng_prod/chances-tv-android
git add cli/package.json cli/package-lock.json cli/CHANGELOG.md cli/README.md
git commit -m "chore(cli): bump patch version for release"
git tag v0.X.Y
git push github master v0.X.Y
```

说明：
- 版本发布由 GitHub Actions 监听 `v*` 标签触发。
- 发布已切到 npm OIDC trusted publishing（免 `NPM_TOKEN`）。

## 五、注意事项

- 规则与仓库约束见：`/Users/chances/workspace/eng_prod/chances-tv-android/AGENTS.md` 与 `/Users/chances/workspace/eng_prod/chances-tv-android/CLAUDE.md`。
- 不要提交真实生产签名资产与线上密钥。
- 模板更新后优先先执行 `npm test` 与模板构建验证，再提 PR。
