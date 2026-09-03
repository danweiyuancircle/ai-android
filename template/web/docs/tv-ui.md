# @chancestv/tv-ui 用法

入口已在 `apps/shell/src/main.ts` 调过 `setupTvFocus`。页面不要再初始化焦点。

## 写页

```vue
<template>
  <EPage id="home" default-focus="play">
    <ERow id="actions">
      <EButton focus-key="play" label="播放" @enter="play" />
    </ERow>
  </EPage>
</template>

<script setup lang="ts">
import { EPage, ERow, EButton } from '@chancestv/tv-ui'
</script>
```

确认用 `@enter`，不要 `@click`。不要 `import '@chancestv/tv-focus'`。

## 组件与事件

| 组件 | 值 | 确认 / 其它 |
|---|---|---|
| EButton / ECard / EImage / EFocusable | — | `@enter` |
| EInput | `v-model` 每个按键 | `@enter` OK 提交（仍可继续输入）；`@change` 失焦且改过内容 |
| ESwitch | `v-model` boolean | OK 切换，并 `@change` |
| ESlider | `v-model` number | 左右调，并 `@change`；到两端再按则焦点离开 |
| EDialog / EDrawer / EToast / EHintDialog | `v-model` 显隐 | 层内焦点已隔离 |
| EVirtual | `:items` | 虚拟列表，边缘 `focus-gutter` |
| EMarquee / EEmpty / EBadge / EText | — | 展示 |

换肤只改 `apps/shell/src/theme.css`：

```css
:root {
  --chances-tv-color-focus: #1677ff;
  --chances-tv-focus-scale: 1; /* 1.08 即放大 */
}
```

样板页：`src/pages/Home.vue`、`Gallery.vue`、`Theme.vue`。写新页读 skill `chances-tv-ui`。不用脚手架接入见 skill 的 `references/integrate.md`。
