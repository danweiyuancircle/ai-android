# create-android-shell

脚手架：按技术栈生成「Android WebView 套壳 + H5」模板工程，定制 applicationId / 应用名 / 图标。

## 用法

```bash
cd cli && npm link    # 本地全局安装（一次）
create-android-shell --parent ./myapp --app-id com.chances.tour --name 旅游助手 --icon ./logo.png
# 或省略 flag 进入交互补齐
create-android-shell
```

flag：`--parent` 工程根目录｜`--app-id` applicationId｜`--name` 应用名｜`--icon` 图标 PNG｜`--stack` 技术栈（默认 android-support-vue）。

## 行为

- 拷壳 + H5 到 `<parent>/`，排除 build/.gradle/.idea/node_modules/dist/*.iml/local.properties
- **只重写 app 模块**包名为 applicationId；lib_base/feature_voice 保持 `com.chances.shell`
- 图标落 `mipmap-xxhdpi/ic_launcher_<appId末段>.png`（唯一名防同步覆盖）
- H5 层只拷贝，base/标题/config 等 TODO 由用户后续改

## 扩展技术栈

编辑 `stacks.js` 加一条（如 `android-support-react` → `template/h5-react/`），主流程零改动。

## 测试

`npm test`（`node --test`，仅 Node 内置模块，需 Node ≥18）。
