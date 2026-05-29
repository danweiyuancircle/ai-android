<template>
  <div class="perf-hud">
    <div class="perf-hud__row">
      <span class="k">Focus</span>
      <span class="v">{{ stats.currentKey || '—' }}</span>
    </div>
    <div class="perf-hud__row">
      <span class="k">Find</span>
      <span class="v">{{ stats.lastFindMs }} ms</span>
    </div>
    <div class="perf-hud__row">
      <span class="k">FPS</span>
      <span class="v">{{ stats.fps }}</span>
    </div>
    <div class="perf-hud__row">
      <span class="k">Items</span>
      <span class="v">{{ stats.mounted }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePerfHud } from '../composables/usePerfHud'

const stats = usePerfHud()
</script>

<style scoped>
.perf-hud {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 9999;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  min-width: 160px;
}
.perf-hud__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.5;
}
.perf-hud__row .k { color: rgba(255, 255, 255, 0.55); }
.perf-hud__row .v {
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
