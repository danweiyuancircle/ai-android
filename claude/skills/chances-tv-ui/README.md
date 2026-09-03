# chances-tv-ui

给人和 AI 用的 `@chancestv/tv-ui` 写页说明。遥控器方向键走空间导航，确认键是 `@enter`，不是 `@click`。

- **用脚手架生成的工程**：打开工程根，本 skill 已在 `.claude/skills/chances-tv-ui` 与 `.agents/skills/chances-tv-ui`。页面写在 `web/apps/shell/src/pages/`。
- **不用脚手架、已有 Vue 工程**：[references/integrate.md](references/integrate.md)（与 [chances-tv-kit docs/integrate.md](https://github.com/danweiyuancircle/chances-tv-kit/blob/main/docs/integrate.md) 同一份内容）。

## 约定

| 要 | 不要 |
|---|---|
| `@chancestv/tv-ui` 的 E* | `import '@chancestv/tv-focus'` |
| `<EPage id default-focus>` | 裸 `button` / `input` / `tabindex` |
| `@enter` | `@click` 当确认 |
| `setupTvFocus` 只在入口调一次 | 每个页面再调一遍 |

## 组件

| 组件 | 值 | 确认 / 其它 |
|---|---|---|
| EButton / ECard / EImage / EFocusable | — | `@enter` |
| EInput | `v-model` 每个按键 | `@enter` 提交（仍可继续输入）；`@change` 失焦且改过内容；方向键离开 |
| ESwitch | `v-model` boolean | OK 切换，`@change` |
| ESlider | `v-model` number | 左右调，`@change`；到两端再按则焦点离开 |
| EDialog / EDrawer / EToast / EHintDialog | `v-model` 显隐 | 层内焦点已隔离，打开须 `default-focus` |
| EVirtual | `:items` | 长列表；`focus-gutter` 防边缘裁切 |
| EMarquee / EEmpty / EBadge / EText | — | 展示 |

换肤：改项目 CSS 变量，不要 fork 组件。

```css
:root {
  --chances-tv-color-focus: #1677ff;
  --chances-tv-focus-scale: 1; /* 1.08 即放大 */
}
```

## AI

写 TV 页先读 [SKILL.md](SKILL.md)。附录在 `references/`。
