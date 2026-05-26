# create-android-shell

脚手架：按技术栈生成「Android WebView 套壳 + H5」模板工程，定制 applicationId / 应用名 / 图标。

## 安装与用法

需 Node ≥18。已发布到 npm（`create-android-shell`），无需 clone 仓库。

```bash
# 免安装直接跑（交互补齐 父目录/applicationId/应用名/图标）
npm create android-shell@latest
# 或带参数（npm create 需用 -- 透传 flag）
npm create android-shell@latest -- --parent ./myapp --app-id com.chances.tour --name 旅游助手 --icon ./logo.png

# 等价：npx create-android-shell / pnpm create android-shell / yarn create android-shell
# 或全局安装：npm i -g create-android-shell && create-android-shell ...
```

flag：`--parent` 工程根目录｜`--app-id` applicationId｜`--name` 应用名｜`--icon` 图标 PNG｜`--stack` 技术栈（默认 android-support-vue）。

> 镜像源注意：包发在官方 registry.npmjs.org。默认源是国内镜像（npmmirror / 公司 Nexus）时，刚发布的新版本可能尚未同步而报 404 —— 加 `--registry https://registry.npmjs.org/` 或等镜像同步。

> 本仓库内开发（已 clone）：`cd cli && npm link` 后用 `create-android-shell`，运行期回退到仓库内 `../template`。

## 行为

- 拷壳 + H5 到 `<parent>/`，排除 build/.gradle/.idea/node_modules/dist/*.iml/local.properties
- **只重写 app 模块**包名为 applicationId；lib_base/feature_voice 保持 `com.chances.shell`
- 图标落 `mipmap-xxhdpi/ic_launcher_<appId末段>.png`（唯一名防同步覆盖）
- H5 层只拷贝，base/标题/config 等 TODO 由用户后续改

## 扩展技术栈

编辑 `stacks.js` 加一条（如 `android-support-react` → `template/h5-react/`），主流程零改动。

## 测试

`npm test`（`node --test`，仅 Node 内置模块，需 Node ≥18）。
