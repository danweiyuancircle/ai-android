<template>
  <EPage id="playground" default-focus="pg-open-dialog" class="pg">
    <h1 class="pg__title">tv-ui Playground</h1>

    <ERow id="pg-locked" restrict="self-only" :gap="16" class="pg__block">
      <EButton focus-key="pg-lock-1" label="锁焦 A" />
      <EButton focus-key="pg-lock-2" label="锁焦 B" />
      <EButton focus-key="pg-lock-3" label="锁焦 C" />
    </ERow>

    <ERow id="pg-row-a" :gap="16" class="pg__block">
      <EButton focus-key="pg-a-1" label="A1" />
      <EButton focus-key="pg-a-2" label="A2" />
    </ERow>
    <ERow id="pg-row-b" :gap="16" class="pg__block">
      <EButton focus-key="pg-b-1" label="B1" />
      <EButton focus-key="pg-b-2" label="B2" />
    </ERow>

    <ERow id="pg-custom" :gap="16" class="pg__block">
      <EFocusable focus-key="pg-poster" v-slot="{ focused }" @enter="toastOpen = true">
        <div :class="['pg-poster', { 'is-focused': focused }]">自定义海报</div>
      </EFocusable>
    </ERow>

    <ERow id="pg-actions" :gap="16" class="pg__block">
      <EButton focus-key="pg-open-dialog" label="开 EDialog" @enter="dialogOpen = true" />
      <EButton focus-key="pg-open-drawer" label="开 EDrawer" @enter="drawerOpen = true" />
      <EButton focus-key="pg-open-toast" label="开 EToast" @enter="toastOpen = true" />
    </ERow>

    <EDialog v-model="dialogOpen" title="确认？" default-focus="pg-dlg-ok">
      <p>这是 EDialog 主体</p>
      <template #footer>
        <EButton focus-key="pg-dlg-ok" label="确定" @enter="dialogOpen = false" />
        <EButton focus-key="pg-dlg-cancel" label="取消" @enter="dialogOpen = false" />
      </template>
    </EDialog>

    <EDrawer v-model="drawerOpen" title="抽屉" default-focus="pg-drawer-ok" placement="right">
      <p>这是 EDrawer 主体</p>
      <template #footer>
        <EButton focus-key="pg-drawer-ok" label="关闭" @enter="drawerOpen = false" />
      </template>
    </EDrawer>

    <EToast v-model="toastOpen" message="这是一条 Toast" />
  </EPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EPage, ERow, EButton, EFocusable, EDialog, EDrawer, EToast } from '@dwy/tv-ui'

const dialogOpen = ref(false)
const drawerOpen = ref(false)
const toastOpen = ref(false)
</script>

<style scoped>
.pg { padding: 32px; color: #fff; }
.pg__title { font-size: 28px; margin-bottom: 24px; }
.pg__block { margin-bottom: 20px; }
.pg-poster {
  width: 200px; height: 120px; border-radius: 8px;
  background: #444; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s ease;
}
.pg-poster.is-focused { transform: scale(1.08); outline: 3px solid #4a9eff; }
</style>
