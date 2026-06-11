# @chancestv/create-android-shell

脚手架：按技术栈生成「Android WebView 套壳 + H5」模板工程。

## 安装与用法

需 Node ≥18。

```bash
# 免安装直接跑（交互补齐 父目录/applicationId/应用名/图标）
npm create @chancestv/android-shell@latest

# 等价：npx @chancestv/create-android-shell / pnpm create @chancestv/android-shell / yarn create @chancestv/android-shell
```

## 发布

仓库采用 GitHub Actions 在 Tag (`vX.Y.Z`) 时发布 `cli`：

1. 更新 `cli/package.json` 版本号；
2. 打标签 `git tag vX.Y.Z && git push github vX.Y.Z`；
3. GitHub Actions 自动执行测试并用 OIDC（trusted publishing）发布到 npm，无需 `NPM_TOKEN`。

OIDC 预置要求（`npmjs.com`）：

- `https://www.npmjs.com/package/@chancestv/create-android-shell` 打开后进入 `Settings → Trusted publishing`；
- 新增 GitHub Actions 入口：`danweiyuancircle` / `ai-android` / `cli-release.yml`；
- 允许操作：`npm publish`；
- 本仓库发布时需保留 workflow 的 `permissions: id-token: write` 与 `contents: write`。

Workflow 文件：`.github/workflows/cli-release.yml`。

## 变更记录

- 本 CLI 的发布日志见：`cli/CHANGELOG.md`

## 本地发布检查（可选）

```bash
cd /Users/chances/StudioProjects/ai-android/cli
npm test
npm pack --dry-run
```

## 发布流程（OIDC）

```bash
cd /Users/chances/StudioProjects/ai-android
cd cli
npm version patch
git add package.json package-lock.json CHANGELOG.md README.md
git commit -m 'chore(cli): bump patch version for release'
git tag v0.X.Y
git push github master v0.X.Y
```
