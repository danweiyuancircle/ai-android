<template>
  <EPage id="gallery" default-focus="g-back" class="page gallery">
    <!-- 固定头部 -->
    <div class="g-head">
      <EButton focus-key="g-back" label="返回" size="sm" @enter="goHome" />
      <h1 class="g-title">组件总览（E*）</h1>
    </div>

    <!-- 焦点跟随滚动区 -->
    <div ref="scrollEl" class="g-scroll">
      <div class="g-track" :style="{ transform: `translateY(${-scrollY}px)`, transition: 'transform 0.18s ease' }">

        <!-- EButton -->
        <section class="g-group">
          <div class="g-label">EButton — 变体 / 尺寸 / 禁用</div>
          <ERow id="g-btn" :gap="16">
            <EButton focus-key="g-btn-1" label="primary" variant="primary" />
            <EButton focus-key="g-btn-2" label="secondary" variant="secondary" />
            <EButton focus-key="g-btn-3" label="ghost" variant="ghost" />
            <EButton focus-key="g-btn-4" label="danger" variant="danger" />
            <EButton focus-key="g-btn-5" label="small" size="sm" />
            <EButton focus-key="g-btn-6" label="large" size="lg" />
            <EButton focus-key="g-btn-7" label="disabled" :disabled="true" />
          </ERow>
        </section>

        <!-- EText / ELoadingSpinner -->
        <section class="g-group">
          <div class="g-label">EText（排版） / ELoadingSpinner（加载）</div>
          <ERow id="g-text" :gap="32" align="center">
            <EFocusable focus-key="g-text-1" v-slot="{ focused }">
              <div class="g-tile" :class="{ hot: focused }">
                <EText text="标题文本" :font-size="28" color="#fff" />
                <EText text="这是一段会按行数省略的说明文本，超出两行显示省略号。" :lines="2" :font-size="20" color="#9aa" />
              </div>
            </EFocusable>
            <ELoadingSpinner text="加载中" size="medium" theme="dark" />
            <ELoadingSpinner size="small" theme="dark" />
          </ERow>
        </section>

        <!-- EImage -->
        <section class="g-group">
          <div class="g-label">EImage（懒加载 / objectFit）</div>
          <ERow id="g-img" :gap="16">
            <EImage
              v-for="i in 6" :key="i"
              :focus-key="`g-img-${i}`"
              :src="pic(i, 240, 150)"
              :width="240" :height="150"
              object-fit="cover" :lazy="true"
            />
          </ERow>
        </section>

        <!-- ECard -->
        <section class="g-group">
          <div class="g-label">ECard（图片卡片）</div>
          <ERow id="g-card" :gap="20">
            <ECard
              v-for="i in 6" :key="i"
              :focus-key="`g-card-${i}`"
              :title="`卡片 ${i}`" description="副标题描述"
              :image="pic(i + 10, 220, 150)" :width="200"
            />
          </ERow>
        </section>

        <!-- EFocusable -->
        <section class="g-group">
          <div class="g-label">EFocusable（自定义可聚焦块）</div>
          <ERow id="g-foc" :gap="16">
            <EFocusable
              v-for="i in 6" :key="i"
              :focus-key="`g-foc-${i}`" v-slot="{ focused }"
            >
              <div class="g-tile sq" :class="{ hot: focused }">块 {{ i }}</div>
            </EFocusable>
          </ERow>
        </section>

        <!-- 浮层触发 -->
        <section class="g-group">
          <div class="g-label">浮层：EDialog / EDrawer / EToast / EHintDialog</div>
          <ERow id="g-overlay" :gap="16">
            <EButton focus-key="g-ov-1" label="打开 Dialog" @enter="dialog = true" />
            <EButton focus-key="g-ov-2" label="打开 Drawer" @enter="drawer = true" />
            <EButton focus-key="g-ov-3" label="弹 Toast" @enter="toast = true" />
            <EButton focus-key="g-ov-4" label="打开 HintDialog" @enter="hint = true" />
          </ERow>
        </section>

        <!-- EVirtual 迷你示例 -->
        <section class="g-group">
          <div class="g-label">EVirtual — 横向</div>
          <EVirtual
            section-id="g-ev-h" direction="horizontal" :items="nums"
            :item-width="140" :item-height="90" :main-visible="6" :gap="14"
            focus-key-prefix="g-evh" v-slot="{ item, focusKey }"
          >
            <EFocusable :focus-key="focusKey" v-slot="{ focused }">
              <div class="g-cell" :class="{ hot: focused }">#{{ item }}</div>
            </EFocusable>
          </EVirtual>
        </section>

        <section class="g-group">
          <div class="g-label">EVirtual — 网格（cross=4）</div>
          <EVirtual
            section-id="g-ev-g" direction="vertical" :cross="4" :items="nums"
            :item-width="150" :item-height="90" :main-visible="2" :gap="14"
            focus-key-prefix="g-evg" v-slot="{ item, focusKey }"
          >
            <EFocusable :focus-key="focusKey" v-slot="{ focused }">
              <div class="g-cell" :class="{ hot: focused }">#{{ item }}</div>
            </EFocusable>
          </EVirtual>
        </section>
      </div>
    </div>

    <!-- 浮层实例 -->
    <EDialog v-model="dialog" title="这是一个 Dialog" default-focus="dlg-ok">
      <EText text="Dialog 内容区，FocusLayer 已自动隔离背景焦点。" :font-size="22" color="#ddd" />
      <template #footer>
        <EButton focus-key="dlg-ok" variant="primary" label="知道了" @enter="dialog = false" />
      </template>
    </EDialog>

    <EDrawer v-model="drawer" placement="right" title="右侧抽屉" default-focus="drw-ok">
      <EText text="Drawer 内容。" :font-size="22" color="#ddd" />
      <template #footer>
        <EButton focus-key="drw-ok" variant="primary" label="关闭" @enter="drawer = false" />
      </template>
    </EDrawer>

    <EHintDialog v-model="hint" message="这是一个提示弹框，确认即关闭。" @confirm="hint = false" />

    <EToast v-model="toast" message="操作成功" placement="center" :duration="1500" />
  </EPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  EPage, ERow, EButton, EText, ELoadingSpinner, EImage, ECard,
  EFocusable, EVirtual, EDialog, EDrawer, EToast, EHintDialog,
} from '@chancestv/tv-ui'
import { useScrollFollow } from '../composables/useScrollFollow'

const router = useRouter()
const goHome = () => router.push({ name: 'Home' })

const dialog = ref(false)
const drawer = ref(false)
const toast = ref(false)
const hint = ref(false)

const nums = Array.from({ length: 40 }, (_, i) => i + 1)
// picsum 在线随机图（离线盒子会裂图，dev/联网环境展示用）
const pic = (seed: number, w: number, h: number) => `https://picsum.photos/seed/g${seed}/${w}/${h}`

// 焦点跟随：把聚焦元素滚进可视区
const scrollEl = ref<HTMLElement | null>(null)
const { scrollY } = useScrollFollow(scrollEl, 540)
</script>

<style scoped>
.gallery { display: flex; flex-direction: column; height: 100%; padding: 0 57px; }
.g-head { display: flex; align-items: center; padding: 24px 0; }
.g-title { font-size: 32px; color: #fff; margin-left: 24px; }
.g-scroll { position: relative; height: 600px; overflow: hidden; }
.g-track { position: absolute; top: 0; left: 0; width: 100%; }
.g-group { margin-bottom: 36px; }
.g-label { font-size: 22px; color: #7fd; margin-bottom: 16px; }
.g-tile {
  width: 360px; min-height: 110px; padding: 16px;
  background: #20242c; border-radius: 12px; border: 4px solid transparent;
}
.g-tile.sq { width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; color: #cfe; font-size: 24px; }
.g-tile.hot { border-color: #4af; }
.g-cell {
  width: 100%; height: 100%; border-radius: 10px; border: 4px solid transparent;
  background: #2a2f3a; color: #cde; display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.g-cell.hot { border-color: #4af; background: #34506e; }
</style>
