# 页面模板

`EPage.id` 必填（焦点 section id）。`default-focus` 是首次进页兜底的 `focus-key`；KeepAlive 返回自动恢复上次焦点，不用手写。

脚手架工程：路由加在 `web/apps/shell/src/router/index.ts`，跳转用 `name`。无脚手架则加到你自己的 router。

## 一级页

```vue
<template>
  <EPage id="home" default-focus="home-ok" class="page">
    <EColumn :gap="24">
      <ERow id="home-actions" :gap="16">
        <EButton focus-key="home-ok" label="确定" variant="primary" @enter="onOk" />
        <EButton focus-key="home-next" label="下一页" @enter="goNext" />
      </ERow>
    </EColumn>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EColumn, ERow, EButton } from '@chancestv/tv-ui'

const router = useRouter()
const onOk = () => { /* 业务 */ }
const goNext = () => router.push({ name: 'Detail' })
</script>
```

## 二级页

```vue
<template>
  <EPage id="detail" default-focus="detail-back" class="page">
    <ERow id="detail-nav" :gap="16">
      <EButton focus-key="detail-back" label="返回" size="sm" @enter="() => router.back()" />
    </ERow>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, ERow, EButton } from '@chancestv/tv-ui'

const router = useRouter()
</script>
```

内容超屏、固定头 + 滚动区：脚手架用 `web/apps/shell/src/composables/useScrollFollow.ts`（见 `Gallery.vue`）。滚动盒自己留 padding，避免焦点描边被裁。
