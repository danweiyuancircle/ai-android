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
2. 打标签 `git tag vX.Y.Z && git push origin vX.Y.Z`；
3. GitHub Actions 自动执行测试并用 `NPM_TOKEN` 发布到 npm。

Workflow 文件：`.github/workflows/cli-release.yml`。
