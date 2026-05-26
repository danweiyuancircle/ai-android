# Changelog

本项目变更记录，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- `publishConfig` 锁定发布到官方源 `registry.npmjs.org`（`npm publish` 免带 `--registry`）。
- 本 CHANGELOG。
- 非交互环境（无 TTY）支持：可选项取默认、`--parent` 缺失报错退出，不再因管道输入挂起。

### Changed
- applicationId / 应用名 / 图标改为**可选**，交互时展示默认值（`com.chances.shell` / `Shell Template` / 保留占位图标），回车留空取默认。
- 图标提示展示尺寸要求（`144×144` PNG，mipmap-xxhdpi）；未提供图标时保留模板占位图 `ic_launcher_shell`，不再强制要求。
- README 安装命令改为 `npm create android-shell` / `npx`（发布后正确用法），`npm link` 降为仓库内本地开发说明；补充 flag 默认值表。

## [0.1.0] - 2026-05-26

首个发布版本。

### Added
- CLI `create-android-shell`：按技术栈生成「Android WebView 套壳 + H5」工程，定制父目录 / applicationId / 应用名 / 图标；支持 flag 与交互补齐双通道。
- 技术栈注册表 `stacks.js`（`android-support-vue`），可扩展。
- 拷贝排除构建产物（build/.gradle/.idea/node_modules/dist/*.iml/local.properties）。
- **只重写 app 模块**包名为 applicationId，保留 lib_base/feature_voice 的 `com.chances.shell.base/.voice` 库包引用。
- 图标落 `mipmap-xxhdpi/ic_launcher_<appId末段>.png`（唯一名防盒子应用同步覆盖）。
- 发布打包内置 template（prepack 拷入、postpack 清理），运行期优先用内置模板、本地开发回退 `../template`。

[Unreleased]: https://gitee.com/sh_chances/ai-android/compare/v0.1.0...HEAD
[0.1.0]: https://gitee.com/sh_chances/ai-android/releases/tag/v0.1.0
