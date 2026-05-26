# Android 套壳脚手架 CLI 设计

日期：2026-05-26
状态：已确认设计，待写实现计划

## 背景

`template/android-shell` 是「Android WebView 壳 + H5 前端」可复用模板。当前两个问题：

1. 模板包名是占位的 `com.example.shell`（`@android:drawable/sym_def_app_icon` 系统默认图标），不像正式工程。
2. 每起一个新项目需手工改 applicationId、应用名、图标、包名，易漏易错。

本设计分两部分：

- **A. 模板基线清理**（一次性手工改 `template/`）
- **B. Node.js 脚手架 CLI**（读 `template/` 生成新工程，可扩展技术栈）

## 决策记录

| 决策点 | 选定 | 理由 |
|---|---|---|
| CLI 设 applicationId 时源码包重写范围 | 只重写 app 模块 | 库层（lib_base/feature_voice）作为共享库固定 `com.chances.shell`，重写面可控，APK 身份正确 |
| CLI 运行时 | Node.js | 与现有 h5-vue / create-dwy 一致，跨平台，npm 可发布，易扩展模板注册表 |
| 脚手架范围 | 壳 + H5 组合 | 符合 README 组合矩阵（android-shell + h5-vue），生成完整可跑工程 |
| 图标处理 | 单图放 mipmap-xxhdpi | 零依赖、TV 盒子够用；命名唯一防同步覆盖 |

## A. 模板基线清理（part 1）

### A.1 包名 `com.example.shell` → `com.chances.shell`（全模块）

涉及模块：`app`、`lib_base`、`feature_voice/core`、`feature_voice/internet`、`feature_voice/shijiu`。

改动清单：

- 源码目录移动 `.../java/com/example/shell/...` → `.../java/com/chances/shell/...`
- Kotlin 文件 `package` 声明与 `import` 中的 `com.example.shell` → `com.chances.shell`
- 5 个 `AndroidManifest.xml` 的 `package="com.example.shell..."` → `com.chances.shell...`
- `app/build.gradle` 的 `applicationId 'com.example.shell'` → `'com.chances.shell'`
- `META-INF/services` SPI 注册文件内容（`VoiceControllerProvider` 实现类全限定名）
- `consumer-rules.pro` 中 keep 规则的包路径

验证：`grep -rn "com.example.shell" template/`（排除 `build/`）零命中。

### A.2 启动图标

- 删除 manifest 的 `android:icon="@android:drawable/sym_def_app_icon"`
- 新建占位 PNG：`app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png`
- manifest 改 `android:icon="@mipmap/ic_launcher_shell"`

**命名理由**：用特殊名 `ic_launcher_shell` 而非通用 `ic_launcher`，避免被部分 TV 盒子 ROM 的「应用同步」机制按通用资源名覆盖。

### A.3 文档同步

`template/README.md` 起项目改动点里的 `com.example.shell` 表述同步为 `com.chances.shell`，补充图标资源名说明。

## B. 脚手架 CLI

### B.1 位置与形态

- 新增仓库顶层目录 `cli/`（与现有 `claude/`、`template/` 并列）。
- Node.js 实现，无重型依赖（仅用 Node 内置模块 + 轻量 prompt，禁止图像库）。
- `cli/package.json` 声明 `bin: { "create-android-shell": "./index.js" }`，本地 `npm link` 后可全局调用。
- CLI 用相对路径读同仓库 `../template/` 作为模板源。

### B.2 技术栈注册表（可扩展点）

`cli/stacks.js`：

```js
module.exports = {
  'android-support-vue': {
    shell: 'android-shell',
    h5: 'h5-vue',
    rules: ['android-dev-spec.md', 'android-support-library-only.md', 'android-webview-5.md'],
    skill: ['chances-sdk'],
  },
  // 后续：'android-support-react': { shell: 'android-shell', h5: 'h5-react', ... }
};
```

新增 react = 加一条注册 + 补 `template/h5-react/`，CLI 主流程零改动。

### B.3 输入

交互 prompt + 同名 flag 双通道：

| flag | 含义 |
|---|---|
| `--parent <dir>` | 父目录名（生成工程根） |
| `--app-id <applicationId>` | APK 包名 |
| `--name <appName>` | 应用名（写入 strings.xml `app_name`） |
| `--icon <path>` | 应用图标 PNG 路径 |
| `--stack <name>` | 技术栈，默认 `android-support-vue` |

缺参数则进入交互 prompt 补齐。

### B.4 生成流程

1. 校验输入（见 B.5）→ 从注册表解析 stack。
2. 拷贝 `shell` + `h5` 到 `<parent>/`，**排除**构建产物：`build/`、`.gradle/`、`.idea/`、`node_modules/`、`dist/`、`*.iml`、`local.properties`。
3. **app 模块包重写**：
   - 动态扫描 app 源码目录，收集「app 自有包集合」= app 模块文件中实际声明的包（`com.chances.shell` 及其下实际存在的子包 `launcher`/`web`/`bridge` 等）。
   - 移动 app 源码目录 `com/chances/shell` → 新 applicationId 对应路径。
   - 重写 app 文件的 `package` 声明（按文件物理位置，前缀 `com.chances.shell` → 新包名）。
   - 重写 app 文件中 FQN 以「app 自有包 + `.`」开头的 `import`。
   - **不动** `com.chances.shell.base`（lib_base）与 `com.chances.shell.voice`（feature_voice）——它们不在 app 模块目录内，自然排除，无前缀误伤。
4. `app/build.gradle` 的 `applicationId` + app `AndroidManifest.xml` 的 `package=` → 新包名。
5. `strings.xml` 的 `app_name` → 新应用名。
6. 图标：
   - `key` = applicationId 末段，sanitize 成 `[a-z0-9_]`。
   - 拷用户 PNG → `mipmap-xxhdpi/ic_launcher_<key>.png`。
   - 删旧 `ic_launcher_shell.png`。
   - manifest `android:icon` → `@mipmap/ic_launcher_<key>`。
7. 打印后续手动步骤：按 README 绑定表拷 rules/skill 到目标 `.claude/`、设 H5 `vite.config.ts` 的 `base`、替换签名 keystore。

H5 层只拷贝、不做内容替换（vite base / 标题等保留 TODO，用户后续改）——CLI 聚焦指定的 4 个参数，符合 YAGNI。

### B.5 错误处理

- `--parent` 已存在且非空 → 报错退出。
- `applicationId` 不符 `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` → 报错。
- `--icon` 路径不存在或非 PNG（按扩展名 + magic number 校验）→ 报错。
- `--stack` 不在注册表 → 报错并列出可选值。

### B.6 验证（成功标准）

- part 1：`grep -rn "com.example.shell" template/`（排除 `build/`）零命中。
- 生成工程后跑 `JAVA_HOME=<jdk8> ./gradlew :app:assembleStagingDebug` 编译通过（与现 README 实测命令一致）。
- 生成工程：app 模块包名 = applicationId，库模块仍 `com.chances.shell`，APK 包名正确，图标资源名唯一。

## 不做的事（范围边界）

- 不做图标多密度生成（不引图像库）。
- 不做 H5 层内容替换（base / 标题 / config json 保留 TODO）。
- 不自动拷 rules/skill 到目标工程（仅打印提示，避免跨目录隐式写）。
- 不发布到 npm registry（本地 `npm link` 使用）。
