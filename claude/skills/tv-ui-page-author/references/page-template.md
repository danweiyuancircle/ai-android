# 页面模板

`EPage.id` 必填（焦点 section id）。`default-focus` 是首次进页兜底的 `focus-key`；KeepAlive 返回自动恢复上次焦点，不用手写。

路由加在 `apps/shell/src/router/index.ts`，跳转用 `name`。

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

路由：

```ts
{ path: '/xxx', name: 'Xxx', component: () => import('../pages/Xxx.vue') }
```

内容超屏、固定头 + 滚动区：用 `apps/shell/src/composables/useScrollFollow.ts`（见 `Gallery.vue`）。
