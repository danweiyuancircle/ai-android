<template>
  <FocusLayer
    v-if="modelValue"
    id="exit-dialog"
    class="exit-dialog-overlay"
    @click.self="handleCancel"
  >
    <div class="exit-dialog">
      <div class="dialog-title">{{ title }}</div>
      <FocusSection id="exit-dialog-btns" :restrict="'self-only'">
        <div class="dialog-buttons">
          <Focusable
            focus-key="exit-confirm-btn"
            v-slot="{ focused }"
            class="dialog-btn-wrap"
            @enter="handleConfirm"
          >
            <button
              class="dialog-btn dialog-btn-primary"
              :class="{ 'is-focused': focused }"
              @click="handleConfirm"
            >{{ confirmText }}</button>
          </Focusable>
          <Focusable
            focus-key="exit-cancel-btn"
            v-slot="{ focused }"
            class="dialog-btn-wrap"
            @enter="handleCancel"
          >
            <button
              class="dialog-btn dialog-btn-secondary"
              :class="{ 'is-focused': focused }"
              @click="handleCancel"
            >{{ cancelText }}</button>
          </Focusable>
        </div>
      </FocusSection>
    </div>
  </FocusLayer>
</template>

<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { Focusable, FocusLayer, FocusSection, SpatialNavigation } from '@dwy/focus-vue3'

interface Props {
  modelValue: boolean
  title?: string
  confirmText?: string
  cancelText?: string
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认退出？',
  confirmText: '确定',
  cancelText: '取消',
})
const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

// 弹框打开时显式聚焦到确定按钮
// （FocusLayer 只做隔离与复焦，初始焦点需调用方显式指定 —— dwy-focus 的契约）
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    await nextTick()
    SpatialNavigation.focus('[data-focus-key="exit-confirm-btn"]')
  },
)
</script>

<style scoped>
.exit-dialog-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 1280px; height: 720px;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.exit-dialog {
  width: 420px;
  padding: 36px 32px 28px;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; align-items: center;
}
.dialog-title { font-size: 24px; color: #fff; margin-bottom: 28px; }
.dialog-buttons { display: flex; gap: 24px; }
.dialog-btn-wrap { display: inline-block; outline: none; }
.dialog-btn-wrap:focus { outline: none; }
.dialog-btn {
  min-width: 120px;
  padding: 12px 28px;
  font-size: 20px;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.dialog-btn.is-focused {
  transform: scale(1.08);
  border-color: #4a9eff;
  background: rgba(74, 158, 255, 0.22);
}
</style>
