<template>
  <EPage id="tvui-test" default-focus="test-back" class="page tvui-test">
    <!-- ===== 固定头部 ===== -->
    <div class="test-head">
      <EButton focus-key="test-back" label="← 返回" size="sm" @enter="goHome" />
      <h1 class="test-title">TV UI 组件测试页</h1>
      <span class="test-subtitle">@chancestv/tv-ui 规范验证</span>
    </div>

    <!-- ===== 焦点跟随滚动区 ===== -->
    <div ref="scrollEl" class="test-scroll">
      <div class="test-track" :style="{ transform: `translateY(${-scrollY}px)`, transition: 'transform 0.18s ease' }">

        <!-- ─── 1. EButton 变体/尺寸/状态 ─── -->
        <section class="test-group">
          <div class="test-group__label">1. EButton — 变体 / 尺寸 / 状态</div>
          <div class="test-group__desc">variant: primary / secondary / ghost / danger; size: sm / md / lg; disabled</div>
          <ERow id="test-btn-variant" :gap="14">
            <EButton focus-key="test-btn-pri" label="Primary" variant="primary" />
            <EButton focus-key="test-btn-sec" label="Secondary" variant="secondary" />
            <EButton focus-key="test-btn-ghost" label="Ghost" variant="ghost" />
            <EButton focus-key="test-btn-dng" label="Danger" variant="danger" />
          </ERow>
          <ERow id="test-btn-size" :gap="14" style="margin-top:12px">
            <EButton focus-key="test-btn-sm" label="小尺寸 sm" size="sm" />
            <EButton focus-key="test-btn-md" label="中尺寸 md" size="md" />
            <EButton focus-key="test-btn-lg" label="大尺寸 lg" size="lg" />
            <EButton focus-key="test-btn-disabled" label="禁用态" :disabled="true" />
            <EButton focus-key="test-btn-disabled-pri" label="禁用 primary" variant="primary" :disabled="true" />
          </ERow>
        </section>

        <!-- ─── 2. EFocusable 自定义聚焦块 ─── -->
        <section class="test-group">
          <div class="test-group__label">2. EFocusable — 自定义可聚焦块</div>
          <div class="test-group__desc">用 v-slot="{ focused }" 自定义聚焦态样式，border 高亮</div>
          <ERow id="test-foc" :gap="16">
            <EFocusable
              v-for="i in 6" :key="i"
              :focus-key="`test-foc-${i}`"
              v-slot="{ focused }"
            >
              <div class="test-tile" :class="{ hot: focused }">
                <span class="test-tile__num">{{ i }}</span>
                <span class="test-tile__label">聚焦块</span>
              </div>
            </EFocusable>
          </ERow>
        </section>

        <!-- ─── 3. EText 排版 ─── -->
        <section class="test-group">
          <div class="test-group__label">3. EText — 排版</div>
          <div class="test-group__desc">font-size / color / lines 省略</div>
          <ERow id="test-text" :gap="24" align="center">
            <EFocusable focus-key="test-text-1" v-slot="{ focused }">
              <div class="test-tile test-tile--text" :class="{ hot: focused }">
                <EText text="大标题 32px" :font-size="32" color="#fff" />
                <EText text="正文 22px 浅色" :font-size="22" color="#aab" />
                <EText text="小字 16px 灰色" :font-size="16" color="#667" />
              </div>
            </EFocusable>
            <EFocusable focus-key="test-text-2" v-slot="{ focused }">
              <div class="test-tile test-tile--text" :class="{ hot: focused }">
                <EText text="多行省略：这是一段较长的说明文本，超出两行时会显示省略号，用于卡片描述等场景。" :lines="2" :font-size="20" color="#cde" />
              </div>
            </EFocusable>
          </ERow>
        </section>

        <!-- ─── 4. EImage 懒加载 ─── -->
        <section class="test-group">
          <div class="test-group__label">4. EImage — 懒加载 / objectFit</div>
          <div class="test-group__desc">lazy 懒加载，objectFit: cover / contain</div>
          <ERow id="test-img" :gap="16">
            <EImage
              v-for="i in 4" :key="i"
              :focus-key="`test-img-${i}`"
              :src="pic(i, 240, 150)"
              :width="240" :height="150"
              object-fit="cover" :lazy="true"
            />
          </ERow>
        </section>

        <!-- ─── 5. ECard 卡片 ─── -->
        <section class="test-group">
          <div class="test-group__label">5. ECard — 图片卡片</div>
          <div class="test-group__desc">title / description / image / width</div>
          <ERow id="test-card" :gap="20">
            <ECard
              v-for="i in 5" :key="i"
              :focus-key="`test-card-${i}`"
              :title="`卡片 ${i}`"
              :description="`副标题描述 ${i}`"
              :image="pic(i + 10, 220, 150)"
              :width="200"
              @enter="onCardEnter(i)"
            />
          </ERow>
        </section>

        <!-- ─── 6. ELoadingSpinner 加载 ─── -->
        <section class="test-group">
          <div class="test-group__label">6. ELoadingSpinner — 加载状态</div>
          <div class="test-group__desc">size: small / medium / large; theme: dark / light</div>
          <ERow id="test-loading" :gap="32" align="center">
            <ELoadingSpinner size="small" theme="dark" />
            <ELoadingSpinner size="medium" theme="dark" text="加载中..." />
            <ELoadingSpinner size="large" theme="dark" text="请稍候" />
          </ERow>
        </section>

        <!-- ─── 7. 浮层触发 ─── -->
        <section class="test-group">
          <div class="test-group__label">7. 浮层 — EDialog / EDrawer / EToast / EHintDialog</div>
          <div class="test-group__desc">FocusLayer 自动隔离背景焦点，关闭后自动复焦</div>
          <ERow id="test-overlay" :gap="16">
            <EButton focus-key="test-ov-dlg" label="打开 Dialog" variant="primary" @enter="dialog = true" />
            <EButton focus-key="test-ov-drw" label="打开 Drawer" variant="secondary" @enter="drawer = true" />
            <EButton focus-key="test-ov-toast" label="弹 Toast" @enter="toast = true" />
            <EButton focus-key="test-ov-hint" label="打开 HintDialog" @enter="hint = true" />
          </ERow>
        </section>

        <!-- ─── 8. EVirtual 横向虚拟滚动 ─── -->
        <section class="test-group">
          <div class="test-group__label">8. EVirtual — 横向虚拟滚动（40 项）</div>
          <div class="test-group__desc">direction=horizontal, 窗口化只渲染可视区</div>
          <EVirtual
            section-id="test-ev-h"
            direction="horizontal"
            :items="nums"
            :item-width="140"
            :item-height="90"
            :main-visible="6"
            :gap="14"
            focus-key-prefix="test-evh"
            v-slot="{ item, focusKey }"
          >
            <EFocusable :focus-key="focusKey" v-slot="{ focused }">
              <div class="test-cell" :class="{ hot: focused }">#{{ item }}</div>
            </EFocusable>
          </EVirtual>
        </section>

        <!-- ─── 9. EVirtual 网格虚拟滚动 ─── -->
        <section class="test-group">
          <div class="test-group__label">9. EVirtual — 网格虚拟滚动（cross=4, 60 项）</div>
          <div class="test-group__desc">direction=vertical, cross=4, 纵向翻页</div>
          <EVirtual
            section-id="test-ev-g"
            direction="vertical"
            :cross="4"
            :items="nums60"
            :item-width="150"
            :item-height="90"
            :main-visible="2"
            :gap="14"
            focus-key-prefix="test-evg"
            v-slot="{ item, focusKey }"
          >
            <EFocusable :focus-key="focusKey" v-slot="{ focused }">
              <div class="test-cell" :class="{ hot: focused }">#{{ item }}</div>
            </EFocusable>
          </EVirtual>
        </section>

        <!-- ─── 10. EFocusGroup 焦点组 ─── -->
        <section class="test-group">
          <div class="test-group__label">10. EFocusGroup — 焦点组（几何导航）</div>
          <div class="test-group__desc">flex-wrap 布局，方向键自动几何导航</div>
          <EFocusGroup id="test-focus-group" tag="div" class="test-fg">
            <EFocusable
              v-for="i in 12" :key="i"
              :focus-key="`test-fg-${i}`"
              v-slot="{ focused }"
            >
              <div class="test-fg__item" :class="{ hot: focused }" @focus="onFgFocus(i)">
                {{ i }}
              </div>
            </EFocusable>
          </EFocusGroup>
          <div class="test-fg__status">最近聚焦：{{ lastFgFocus ? `#${lastFgFocus}` : '无' }}</div>
        </section>

        <!-- ─── 11. ERow / EColumn 布局 ─── -->
        <section class="test-group">
          <div class="test-group__label">11. ERow / EColumn — 行列布局</div>
          <div class="test-group__desc">ERow 横向排列（gap/align），EColumn 纵向排列</div>
          <EColumn id="test-col" :gap="10" class="test-col-demo">
            <div class="test-col-demo__label">EColumn 纵向</div>
            <ERow id="test-row-1" :gap="12">
              <EButton focus-key="test-row-a" label="行1-A" size="sm" />
              <EButton focus-key="test-row-b" label="行1-B" size="sm" />
              <EButton focus-key="test-row-c" label="行1-C" size="sm" />
            </ERow>
            <ERow id="test-row-2" :gap="12">
              <EButton focus-key="test-row-d" label="行2-A" size="sm" />
              <EButton focus-key="test-row-e" label="行2-B" size="sm" />
            </ERow>
          </EColumn>
        </section>

        <!-- ─── 12. 桥接调用测试 ─── -->
        <section class="test-group">
          <div class="test-group__label">12. JSBridge — ottService / voiceService 调用</div>
          <div class="test-group__desc">调用原生桥接方法（非 Android 环境只打日志不抛错）</div>
          <ERow id="test-bridge" :gap="14">
            <EButton focus-key="test-br-toast" label="弹 Toast" @enter="callToast" />
            <EButton focus-key="test-br-info" label="获取设备信息" @enter="callBaseInfo" />
            <EButton focus-key="test-br-tts" label="播放 TTS" @enter="callTts" />
            <EButton focus-key="test-br-stoptts" label="停止 TTS" @enter="callStopTts" />
            <EButton focus-key="test-br-back" label="canGoBack" @enter="callCanGoBack" />
          </ERow>
          <div v-if="bridgeResult" class="test-bridge-result">
            <EText :text="bridgeResult" :font-size="18" color="#7fd" />
          </div>
        </section>

      </div>
    </div>

    <!-- ===== 浮层实例 ===== -->
    <EDialog v-model="dialog" title="Dialog 弹框" default-focus="dlg-ok">
      <EText text="这是一个 EDialog 弹框。FocusLayer 已自动隔离背景焦点，关闭后自动复焦到触发按钮。" :font-size="22" color="#ddd" />
      <EText text="方向键在弹框内导航，返回键关闭弹框。" :font-size="20" color="#889" style="margin-top:12px" />
      <template #footer>
        <EButton focus-key="dlg-ok" variant="primary" label="知道了" @enter="dialog = false" />
        <EButton focus-key="dlg-cancel" label="取消" @enter="dialog = false" />
      </template>
    </EDialog>

    <EDrawer v-model="drawer" placement="right" title="右侧 Drawer" default-focus="drw-ok">
      <EText text="Drawer 从右侧滑入，同样有 FocusLayer 隔离。" :font-size="22" color="#ddd" />
      <template #footer>
        <EButton focus-key="drw-ok" variant="primary" label="关闭" @enter="drawer = false" />
      </template>
    </EDrawer>

    <EHintDialog v-model="hint" message="这是一个提示弹框，按确认关闭。" @confirm="hint = false" />

    <EToast v-model="toast" message="操作成功！" placement="center" :duration="1500" />
  </EPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  EPage, ERow, EColumn, EButton, EText, ELoadingSpinner, EImage, ECard,
  EFocusable, EFocusGroup, EVirtual, EDialog, EDrawer, EToast, EHintDialog,
} from '@chancestv/tv-ui'
import { ottService, voiceService } from '@shell/core'
import { useScrollFollow } from '../composables/useScrollFollow'

const router = useRouter()
const goHome = () => router.push({ name: 'Home' })

// ── 浮层状态 ──
const dialog = ref(false)
const drawer = ref(false)
const toast = ref(false)
const hint = ref(false)

// ── 虚拟滚动数据 ──
const nums = Array.from({ length: 40 }, (_, i) => i + 1)
const nums60 = Array.from({ length: 60 }, (_, i) => i + 1)

// ── 图片占位 ──
const pic = (seed: number, w: number, h: number) =>
  `https://picsum.photos/seed/t${seed}/${w}/${h}`

// ── 卡片点击 ──
const onCardEnter = (i: number) => {
  toast.value = true
}

// ── EFocusGroup 状态 ──
const lastFgFocus = ref<number | null>(null)
const onFgFocus = (i: number) => {
  lastFgFocus.value = i
}

// ── 桥接调用 ──
const bridgeResult = ref('')

const callToast = () => {
  ottService.showToast('来自测试页的 Toast')
  bridgeResult.value = '已调用 showToast'
}

const callBaseInfo = () => {
  const info = ottService.getBaseInfo()
  bridgeResult.value = info
    ? `设备信息: ${info.deviceModel} / Android ${info.androidVersion} / ${info.packageName}`
    : 'getBaseInfo 返回 null（非 Android 环境）'
}

const callTts = () => {
  voiceService.playTts('TV UI 测试页面，组件验证通过')
  bridgeResult.value = '已调用 playTts'
}

const callStopTts = () => {
  voiceService.stopTts()
  bridgeResult.value = '已调用 stopTts'
}

const callCanGoBack = () => {
  const can = ottService.canGoBack()
  bridgeResult.value = `canGoBack: ${can}`
}

// ── 焦点跟随滚动 ──
const scrollEl = ref<HTMLElement | null>(null)
const { scrollY } = useScrollFollow(scrollEl, 540)
</script>

<style scoped>
/* ── 页面布局 ── */
.tvui-test {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 57px;
  color: #cde;
}

/* ── 头部 ── */
.test-head {
  display: flex;
  align-items: center;
  padding: 24px 0;
  flex-shrink: 0;
}
.test-title {
  font-size: 32px;
  color: #fff;
  margin-left: 24px;
}
.test-subtitle {
  font-size: 18px;
  color: #7fd;
  margin-left: 16px;
  margin-top: 6px;
}

/* ── 滚动区 ── */
.test-scroll {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.test-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* ── 分组 ── */
.test-group {
  margin-bottom: 40px;
}
.test-group__label {
  font-size: 24px;
  color: #fff;
  margin-bottom: 6px;
}
.test-group__desc {
  font-size: 16px;
  color: #667;
  margin-bottom: 16px;
}

/* ── 自定义聚焦块 ── */
.test-tile {
  width: 140px;
  height: 100px;
  background: #20242c;
  border-radius: 12px;
  border: 4px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: border-color 0.15s, background 0.15s;
}
.test-tile.hot {
  border-color: #4af;
  background: #2a3a4e;
}
.test-tile__num {
  font-size: 28px;
  font-weight: bold;
  color: #7fd;
}
.test-tile__label {
  font-size: 16px;
  color: #889;
}
.test-tile--text {
  width: 360px;
  height: auto;
  min-height: 100px;
  padding: 16px;
  align-items: flex-start;
  gap: 8px;
}

/* ── 虚拟滚动单元格 ── */
.test-cell {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: 4px solid transparent;
  background: #2a2f3a;
  color: #cde;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: border-color 0.15s, background 0.15s;
}
.test-cell.hot {
  border-color: #4af;
  background: #34506e;
}

/* ── EFocusGroup 演示 ── */
.test-fg {
  display: flex;
  flex-wrap: wrap;
  margin: -6px;
}
.test-fg__item {
  width: 70px;
  height: 70px;
  background: #2a2f3a;
  border-radius: 8px;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #cde;
  transition: border-color 0.15s, background 0.15s;
}
.test-fg__item.hot {
  border-color: #4af;
  background: #34506e;
}
.test-fg__status {
  margin-top: 10px;
  font-size: 16px;
  color: #7fd;
}

/* ── EColumn 演示 ── */
.test-col-demo {
  background: #1a1e26;
  border-radius: 12px;
  padding: 16px;
}
.test-col-demo__label {
  font-size: 18px;
  color: #889;
  margin-bottom: 4px;
}

/* ── 桥接结果 ── */
.test-bridge-result {
  margin-top: 12px;
  padding: 10px 16px;
  background: #1a1e26;
  border-radius: 8px;
  border: 1px solid #2a3a4e;
}
</style>
