# Changelog

本项目变更记录，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.4.1] - 2026-06-05

### Changed
- README 精简为仅安装与用法（npm 包页面只展示安装命令），flag 表 / 行为 / 扩展 / 测试等开发向说明移除（详见仓库 AGENTS.md 与源码）。

## [0.4.0] - 2026-06-05

### Changed
- **包名迁移到 npm 组织**：`create-android-shell` → `@chancestv/create-android-shell`。免安装命令改为 `npm create @chancestv/android-shell`（`npx @chancestv/create-android-shell` 等价）。原无 scope 包停更，新版只发 scoped 包。
- 模板 H5（`template/h5-vue/`）删除内置 focus 库与本地 `packages/tv-ui`，改引用已发布的 `@chancestv/tv-focus`、`@chancestv/tv-ui`（0.4.0）；版本统一在 pnpm `catalog` 管理。

## [0.3.0] - 2026-05-29

### Added
- 生成流程集成**语音配置**：交互选视九（`shijiu`）或 OTT 互联网（`internet`）语音；OTT 再选云平台（讯飞 / 腾讯 / 火山）并按需填密钥，直接写入壳工程 `gradle.properties` 的 `voice.engine` + `voice.internet.*`。新增 `--voice` / `--voice-platform` flag（密钥仅交互填，非交互留空）。

### Changed
- 模板 `gradle.properties` 取消「真实密钥放 `~/.gradle` 不入库」的安全约定，改为脚手架按所选平台直接写入项目（密钥留空仍可过编译）。

## [0.2.0] - 2026-05-26

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

[Unreleased]: https://gitee.com/sh_chances/ai-android/compare/v0.4.1...HEAD
[0.4.1]: https://gitee.com/sh_chances/ai-android/compare/v0.4.0...v0.4.1
[0.4.0]: https://gitee.com/sh_chances/ai-android/compare/v0.3.0...v0.4.0
[0.3.0]: https://gitee.com/sh_chances/ai-android/compare/v0.2.0...v0.3.0
[0.2.0]: https://gitee.com/sh_chances/ai-android/compare/v0.1.0...v0.2.0
[0.1.0]: https://gitee.com/sh_chances/ai-android/releases/tag/v0.1.0
