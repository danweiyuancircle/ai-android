# 绝对禁忌（Anti-Patterns）

违反任意一条 = ESLint 报错或运行期无焦点。

| ❌ 反例 | ✅ 正确 | 原因 |
|---|---|---|
| `import { FocusSection } from '@dwy/focus-vue3'` | 用 `<EFocusGroup>` / `<ERow>` / `<EColumn>` | 业务层不接触 focus-vue3（ESLint 拦截） |
| `import { useFocusPage } from '@shell/core'` | 用 `<EPage>` | useFocusPage 已删除 |
| `<button>` / `<a>` / `<input>` / 裸 `tabindex` | `<EButton>` / `<EFocusable>` / 对应 tv-ui 组件 | 裸标签不进 SN，焦点不可用（ESLint `vue/no-restricted-html-elements` + `vue/no-restricted-static-attribute` 拦截） |
| `<div tabindex="0" @keyup.enter="...">` | `<EButton>` 或 `<EFocusable>` | 裸 div 不进 SN，键位不归一 |
| `<EButton>` 漏 `focus-key` | 必填 `focus-key` | 焦点记忆 / 测试定位 / 调试要靠它 |
| `<ERow>` 漏 `id` | `<ERow id="...">` | 子焦点区无名 = section 间无法跨页记忆 |
| `<EDialog>` 漏 `default-focus` | `<EDialog default-focus="confirm-btn">` | 编译期强制必填；漏填 = 弹框打开无焦点 |
| 自己写 v-if + Teleport + 手动焦点 | `<EDialog>` | 重复造轮 + 易漏 FocusLayer |
| `<EButton @click="goto(...)">` | `<EButton @enter="goto(...)">` | @click 在遥控器路径上不触发（业务模板 `@click` 被 `vue/no-restricted-v-on` 拦截） |
