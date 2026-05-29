# 页面模板

## 一级页模板

来源：`template/h5-vue/apps/shell/src/pages/Home.vue`（真实迁移后代码）

```vue
<template>
  <EPage id="home" default-focus="home-detail" class="page home">
    <p class="hint">遥控器方向键移动焦点，OK 键确认，返回键退出。</p>
    <div class="actions">
      <EButton focus-key="home-detail" label="进入详情页" @enter="goDetail" />
      <EButton focus-key="home-soon" label="敬请期待页" @enter="goSoon" />
      <EButton focus-key="home-perf" label="性能压测页" @enter="goPerf" />
      <EButton focus-key="home-tts" label="播报 TTS" @enter="speak" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'
import { ottService } from '@shell/core'

const router = useRouter()
const goDetail = () => router.push({ name: 'Detail' })
const goSoon = () => router.push({ name: 'ComingSoon' })
const goPerf = () => router.push({ name: 'Perf' })
const speak = () => ottService.playTts('这是一个壳模板首页')
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.hint {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 60px;
}
.actions { display: flex; }
.actions > *:not(:first-child) { margin-left: 40px; }
</style>
```

## 二级页模板

来源：`template/h5-vue/apps/shell/src/pages/Detail.vue`（真实迁移后代码）

```vue
<template>
  <EPage id="detail" default-focus="detail-back" class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <EButton focus-key="detail-back" label="返回首页" @enter="goBack" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'

const router = useRouter()
const goBack = () => router.back()
</script>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.title {
  font-size: 40px;
  color: #fff;
  margin-bottom: 40px;
}
</style>
```

## 契约说明

1. **`EPage.id` 必填且与 `default-focus` 配对**：`id` 标识当前页面焦点作用域，`default-focus` 指定进页时首个获焦元素的 `focus-key`，两者必须同时填写且 `default-focus` 值必须在页内存在对应 `focus-key`。
2. **多焦点子区域用 `<ERow id="...">` / `<EColumn id="...">` 命名**：容器有 `id` 才能跨页记忆上次焦点位置；匿名容器每次进页都回到第一项。
3. **KeepAlive 暂停/恢复与进页聚焦由 EPage 自动接管**：业务代码不需要写 `onActivated`/`onDeactivated` 处理焦点，也不调 `SpatialNavigation.focus`，EPage 内部已统一处理。
