<!-- 全项目强制使用 Android Support 库，禁止 AndroidX -->

# 强制 Support 库 / 禁止 AndroidX

适用于本项目全部**开发与技术选型**。统一使用旧版 Android Support 库（`com.android.support:*`，包名 `android.support.*`），**禁止**迁移或引入 AndroidX（`androidx.*`）。

## 一、技术选型

- **禁止**引入任何 `androidx.*` 依赖；选库时只选有 support 版本的方案
- **禁止** `gradle.properties` 开启 `android.useAndroidX=true` / `android.enableJetifier=true`（保持 false 或不设）
- 第三方库仅有 androidx 版本、无 support 版本 → 先评估替换或锁旧版本，**禁止**为单库开全局 Jetifier
- 新增依赖必须确认传递依赖不拖入 `androidx.*`，必要时 `exclude group: 'androidx.xxx'`

## 二、编码（import / 包名）

- **禁止** `import androidx.*`，一律用对应 support 包
- XML 自定义控件用 support 全限定名（如 `android.support.v7.widget.RecyclerView`）
- Material 组件用 `android.support.design.widget.*`，**禁止** `com.google.android.material.*`
