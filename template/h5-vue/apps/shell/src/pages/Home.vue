<template>
  <div class="page home">
    <h1 class="title">H5 Shell Template</h1>
    <p class="hint">遥控器方向键移动焦点，OK 键确认，返回键退出。</p>
    <div class="actions">
      <FocusableButton focus-key="home-detail" @click="goDetail">进入详情页</FocusableButton>
      <FocusableButton focus-key="home-soon" @click="goSoon">敬请期待页</FocusableButton>
      <FocusableButton focus-key="home-tts" @click="speak">播报 TTS</FocusableButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FocusableButton } from '@shell/ui'
import { ottService } from '@shell/core'

const router = useRouter()

const goDetail = () => router.push({ name: 'Detail' })
const goSoon = () => router.push({ name: 'ComingSoon' })
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
.title {
  font-size: 48px;
  color: #fff;
  margin-bottom: 20px;
}
.hint {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 60px;
}
.actions {
  display: flex;
}
.actions > *:not(:first-child) {
  margin-left: 40px;
}
</style>
