<template>
  <EPage id="home" default-focus="home-gallery" class="page home">
    <p class="hint">遥控器方向键移动焦点，OK 键确认，返回键退出。</p>
    <div class="actions">
      <EButton focus-key="home-gallery" label="组件总览" variant="primary" @enter="goGallery" />
      <EButton focus-key="home-scene" label="分类场景" variant="primary" @enter="goScene" />
      <EButton focus-key="home-detail" label="进入详情页" @enter="goDetail" />
      <EButton focus-key="home-soon" label="敬请期待页" @enter="goSoon" />
      <EButton focus-key="home-perf" label="性能压测页" @enter="goPerf" />
      <EButton focus-key="home-tts" label="播报 TTS" @enter="speak" />
      <EButton focus-key="home-tvui" label="TV UI 测试页" variant="primary" @enter="goTvUiTest" />
      <EButton focus-key="home-ldt" label="列表详情测试" variant="primary" @enter="goListDetailTest" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@chancestv/tv-ui'
import { voiceService } from '@shell/core'

const router = useRouter()
const goGallery = () => router.push({ name: 'Gallery' })
const goScene = () => router.push({ name: 'Scene' })
const goDetail = () => router.push({ name: 'Detail' })
const goSoon = () => router.push({ name: 'ComingSoon' })
const goPerf = () => router.push({ name: 'Perf' })
const goTvUiTest = () => router.push({ name: 'TvUiTest' })
const goListDetailTest = () => router.push({ name: 'ListDetailTest' })
const speak = () => voiceService.playTts('这是一个壳模板首页')
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
.actions { display: flex; flex-wrap: wrap; justify-content: center; max-width: 1100px; margin: -12px; }
.actions > * { margin: 12px; }
</style>
