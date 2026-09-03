<template>
  <EPage id="examples" default-focus="ex-gallery" class="page examples">
    <p class="hint">组件与焦点示例。正式项目可从首页拿掉入口，这些页面可继续留在工程里对照。</p>
    <div class="actions">
      <EButton focus-key="ex-gallery" label="组件总览" @enter="go('Gallery')" />
      <EButton focus-key="ex-scene" label="分类场景" @enter="go('Scene')" />
      <EButton focus-key="ex-theme" label="焦点换肤" @enter="go('Theme')" />
      <EButton focus-key="ex-detail" label="详情页占位" @enter="go('Detail')" />
      <EButton focus-key="ex-soon" label="敬请期待" @enter="go('ComingSoon')" />
      <EButton focus-key="ex-player" label="播放器控制" @enter="go('PlayerControl')" />
      <EButton focus-key="ex-home" label="返回首页" @enter="go('Home')" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@chancestv/tv-ui'

const router = useRouter()
const go = (name: string) => router.push({ name })
</script>

<style scoped>
.examples {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px 72px;
  box-sizing: border-box;
}
.hint {
  font-size: 22px;
  color: #667085;
  margin-bottom: 48px;
  max-width: 900px;
  text-align: center;
}
.actions { display: flex; flex-wrap: wrap; justify-content: center; max-width: 1100px; margin: -12px; }
.actions > * { margin: 12px; }
</style>
