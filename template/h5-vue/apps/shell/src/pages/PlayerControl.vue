<template>
  <EPage id="player-control" default-focus="pl-play" class="page player-control">
    <!-- ===== 顶部：返回 + 标题 + 状态 ===== -->
    <div class="pl-top">
      <EButton focus-key="pl-back" label="← 返回" size="sm" @enter="goBack" />
      <h1 class="pl-title">播放器控制</h1>
      <span class="pl-status">{{ statusText }}</span>
    </div>

    <!-- ===== 舞台占位：真正的视频在 WebView 之下由原生播放器渲染（背播），本页为透明控制层 ===== -->
    <div class="pl-stage">
      <EText
        text="视频在 WebView 之下播放（背播）。本页是透明控制层；非 Android 环境下桥接只打日志。"
        :font-size="20"
        color="#9ab"
      />
      <EText
        v-if="playerId"
        :text="`实例 id：${playerId} / 引擎：${engineLabel}`"
        :font-size="18"
        color="#7fd"
        style="margin-top: 8px"
      />
    </div>

    <!-- ===== 底部控制条 ===== -->
    <div class="pl-bar">
      <!-- 进度条：聚焦后 ← / → 快退快进，OK 播放/暂停 -->
      <div class="pl-progress-row">
        <span class="pl-time">{{ currentText }}</span>
        <EFocusable
          focus-key="pl-progress"
          v-slot="{ focused }"
          @focus="progressFocused = true"
          @blur="progressFocused = false"
          @enter="togglePlay"
        >
          <div class="pl-progress" :class="{ hot: focused }">
            <div class="pl-progress__buffer" :style="{ width: bufferPercent + '%' }" />
            <div class="pl-progress__played" :style="{ width: progressPercent + '%' }" />
            <div class="pl-progress__thumb" :style="{ left: progressPercent + '%' }" />
          </div>
        </EFocusable>
        <span class="pl-time">{{ durationText }}</span>
      </div>
      <div class="pl-hint">聚焦进度条后 ← / → 快退快进 10 秒，OK 播放 / 暂停</div>

      <!-- 传输控制 -->
      <ERow id="pl-transport" :gap="14" class="pl-transport">
        <EButton focus-key="pl-back10" label="⏪ 10s" @enter="seekBy(-SEEK_STEP_MS)" />
        <EButton
          focus-key="pl-play"
          :label="isPlaying ? '⏸ 暂停' : '▶ 播放'"
          variant="primary"
          @enter="togglePlay"
        />
        <EButton focus-key="pl-fwd10" label="10s ⏩" @enter="seekBy(SEEK_STEP_MS)" />
        <EButton focus-key="pl-stop" label="⏹ 停止" @enter="stop" />
        <EButton focus-key="pl-mute" :label="muted ? '🔇 静音' : '🔊 有声'" @enter="toggleMute" />
        <EButton focus-key="pl-speed" :label="`倍速 ${speed}x`" @enter="cycleSpeed" />
      </ERow>

      <!-- 引擎切换（多引擎，按 type 区分） -->
      <ERow id="pl-engine" :gap="14" class="pl-engine" align="center">
        <span class="pl-label">引擎</span>
        <EButton
          v-for="e in ENGINES"
          :key="e.type"
          :focus-key="`pl-eng-${e.type}`"
          :label="e.label"
          :variant="engine === e.type ? 'primary' : 'secondary'"
          @enter="switchEngine(e.type)"
        />
      </ERow>

      <!-- 片源切换 -->
      <ERow id="pl-preset" :gap="14" class="pl-preset" align="center">
        <span class="pl-label">片源</span>
        <EButton
          v-for="(p, idx) in PRESETS"
          :key="idx"
          :focus-key="`pl-src-${idx}`"
          :label="p.label"
          :variant="currentUrl === p.url ? 'primary' : 'secondary'"
          @enter="loadPreset(p.url)"
        />
      </ERow>
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EPage, ERow, EButton, EText, EFocusable } from '@chancestv/tv-ui'
import { playerService, setPlayerCallbacks, clearPlayerCallbacks, type PlayerType } from '@shell/core'

const router = useRouter()
const goBack = () => router.back()

/** 快进 / 快退步长（毫秒） */
const SEEK_STEP_MS = 10000

/** 可选引擎（多实例 + 多引擎：切换引擎 = 释放旧实例并以新引擎重建） */
const ENGINES: { type: PlayerType; label: string }[] = [
  { type: 'ijk', label: 'ijkplayer' },
  { type: 'native', label: '系统 MediaPlayer' },
]

/** 预置片源 */
const PRESETS = [
  { label: '示例 MP4', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
  { label: '示例 HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
]

const SPEEDS = [0.5, 1, 1.5, 2]

const playerId = ref('')
const engine = ref<PlayerType>('ijk')
const currentUrl = ref(PRESETS[0].url)
const isPlaying = ref(false)
const durationMs = ref(0)
const positionMs = ref(0)
const bufferPercent = ref(0)
const muted = ref(false)
const speed = ref(1)
const statusText = ref('未创建')
const progressFocused = ref(false)

// 引擎切换后需在 onPrepared 时恢复到的进度
let pendingSeekMs = 0
let pollTimer: number | undefined

const engineLabel = computed(() => ENGINES.find((e) => e.type === engine.value)?.label ?? engine.value)
const seekable = computed(() => durationMs.value > 0)
const progressPercent = computed(() =>
  durationMs.value > 0 ? Math.min(100, (positionMs.value / durationMs.value) * 100) : 0
)
const currentText = computed(() => fmt(positionMs.value))
const durationText = computed(() => fmt(durationMs.value))

function fmt(ms: number): string {
  if (!ms || ms < 0) return '00:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** 释放旧实例并以指定引擎 + 片源创建新实例（多引擎切换核心） */
function createPlayer(type: PlayerType, url: string, autoPlay: boolean, resumeMs = 0) {
  if (playerId.value) {
    playerService.release(playerId.value)
  }
  engine.value = type
  currentUrl.value = url
  durationMs.value = 0
  positionMs.value = 0
  bufferPercent.value = 0
  pendingSeekMs = resumeMs
  const id = playerService.setup({
    playerType: type,
    url,
    autoPlay,
    mute: muted.value,
    speed: speed.value,
  })
  playerId.value = id
  isPlaying.value = autoPlay
  statusText.value = `创建 ${type}`
}

function switchEngine(type: PlayerType) {
  if (type === engine.value) return
  // 记住当前进度与播放态，新引擎重建后恢复
  createPlayer(type, currentUrl.value, isPlaying.value, positionMs.value)
}

function loadPreset(url: string) {
  if (url === currentUrl.value && playerId.value) return
  createPlayer(engine.value, url, true)
}

function togglePlay() {
  const id = playerId.value
  if (!id) {
    createPlayer(engine.value, currentUrl.value, true)
    return
  }
  if (isPlaying.value) {
    playerService.pause(id)
    isPlaying.value = false
  } else {
    playerService.start(id)
    isPlaying.value = true
  }
}

function stop() {
  const id = playerId.value
  if (!id) return
  playerService.stop(id)
  isPlaying.value = false
  positionMs.value = 0
  statusText.value = '已停止'
}

function seekBy(deltaMs: number) {
  const id = playerId.value
  if (!id || !seekable.value) return
  const next = Math.max(0, Math.min(durationMs.value, positionMs.value + deltaMs))
  positionMs.value = next
  playerService.seekTo(id, next)
}

function toggleMute() {
  muted.value = !muted.value
  if (playerId.value) playerService.setMute(playerId.value, muted.value)
}

function cycleSpeed() {
  const i = SPEEDS.indexOf(speed.value)
  speed.value = SPEEDS[(i + 1) % SPEEDS.length]
  if (playerId.value) playerService.setSpeed(playerId.value, speed.value)
}

/**
 * 进度条 seek：在 capture 阶段抢先于 tv-focus 的 keydown 导航处理左右键，
 * 仅当进度条聚焦且可 seek 时拦截（stopImmediatePropagation 阻止焦点移走），其余按键照常导航。
 */
function onCaptureKeydown(e: KeyboardEvent) {
  if (!progressFocused.value || !seekable.value) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    e.stopImmediatePropagation()
    seekBy(-SEEK_STEP_MS)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    e.stopImmediatePropagation()
    seekBy(SEEK_STEP_MS)
  }
}

function registerCallbacks() {
  setPlayerCallbacks({
    onPrepared: (id) => {
      if (id !== playerId.value) return
      durationMs.value = playerService.getDuration(id)
      if (pendingSeekMs > 0) {
        playerService.seekTo(id, pendingSeekMs)
        pendingSeekMs = 0
      }
      statusText.value = '已准备'
    },
    onCompletion: (id) => {
      if (id !== playerId.value) return
      isPlaying.value = false
      statusText.value = '播放完成'
    },
    onError: (id, what, extra) => {
      if (id !== playerId.value) return
      isPlaying.value = false
      statusText.value = `错误 what=${what} extra=${extra}`
    },
    onInfo: (id, what) => {
      if (id !== playerId.value) return
      if (what === 1) statusText.value = '缓冲中…'
      else if (what === 2) statusText.value = '播放中'
      else if (what === 3) statusText.value = '首帧渲染'
    },
    onBufferingUpdate: (id, percent) => {
      if (id !== playerId.value) return
      bufferPercent.value = percent
    },
    onSeekComplete: (id) => {
      if (id !== playerId.value) return
      positionMs.value = playerService.getCurrentPosition(id)
    },
    onStateChange: (id, state) => {
      if (id !== playerId.value) return
      isPlaying.value = state === 1
    },
  })
}

function startPoll() {
  stopPoll()
  pollTimer = window.setInterval(() => {
    const id = playerId.value
    if (!id || !isPlaying.value) return
    positionMs.value = playerService.getCurrentPosition(id)
    if (durationMs.value <= 0) durationMs.value = playerService.getDuration(id)
  }, 500)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

onMounted(() => {
  // tv-ui 全局样式把 html/body 设为 #1a1a1a 不透明，会挡住 WebView 下层的原生视频
  document.documentElement.classList.add('player-backplay')
  window.addEventListener('keydown', onCaptureKeydown, true)
  registerCallbacks()
  startPoll()
  // 进页面即创建默认引擎实例并装载首个片源（不自动起播，等用户按播放）
  createPlayer(engine.value, currentUrl.value, false)
})

onUnmounted(() => {
  document.documentElement.classList.remove('player-backplay')
  window.removeEventListener('keydown', onCaptureKeydown, true)
  clearPlayerCallbacks()
  stopPoll()
  if (playerId.value) playerService.release(playerId.value)
})
</script>

<!-- 背播：覆盖 tv-ui index.css 里 html/body 的 #1a1a1a 不透明背景 -->
<style>
html.player-backplay,
html.player-backplay body,
html.player-backplay #app,
html.player-backplay .tv-app {
  background-color: transparent !important;
}
</style>

<style scoped>
.player-control {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 透明：让 WebView 之下的原生播放器视频透出（背播） */
  background: transparent;
  color: #cde;
}

/* 顶部 */
.pl-top {
  display: flex;
  align-items: center;
  padding: 24px 57px;
  flex-shrink: 0;
}
.pl-title {
  font-size: 30px;
  color: #fff;
  margin-left: 24px;
}
.pl-status {
  font-size: 18px;
  color: #7fd;
  margin-left: 16px;
}

/* 舞台占位：中间区域全透明，视频从 WebView 之下透出 */
.pl-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 57px;
  background: transparent;
}

/* 底部控制条 */
.pl-bar {
  flex-shrink: 0;
  padding: 24px 57px 40px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0));
}

/* 进度条 */
.pl-progress-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.pl-time {
  font-size: 20px;
  color: #cde;
  min-width: 64px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.pl-progress {
  position: relative;
  flex: 1;
  height: 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  border: 3px solid transparent;
  box-sizing: content-box;
  transition: border-color 0.15s, height 0.15s;
}
.pl-progress.hot {
  border-color: #4af;
  height: 14px;
}
.pl-progress__buffer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.32);
}
.pl-progress__played {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 6px;
  background: #4af;
}
.pl-progress__thumb {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px rgba(74, 170, 255, 0.8);
}
.pl-hint {
  font-size: 15px;
  color: #889;
  margin: 8px 0 18px 80px;
}

/* 各操作行 */
.pl-transport,
.pl-engine,
.pl-preset {
  margin-top: 14px;
}
.pl-label {
  font-size: 18px;
  color: #889;
  margin-right: 8px;
}
</style>
