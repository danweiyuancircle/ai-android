<template>
  <FocusLayer
    v-if="modelValue"
    id="hint-dialog"
    class="hint-dialog-overlay"
    @click.self="handleCancel"
  >
    <div class="hint-dialog">
      <div class="dialog-content">
        <Text :lines="2" :text="message" class="dialog-message" />
      </div>
      <FocusSection id="hint-dialog-btns" :restrict="'self-only'">
        <div class="dialog-buttons">
          <Focusable
            v-if="showConfirm"
            focus-key="hint-confirm-btn"
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
            v-if="showCancel"
            focus-key="hint-cancel-btn"
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
import Text from './Text.vue'
import { Focusable, FocusLayer, FocusSection } from '@dwy/focus-vue3'

interface Props {
  modelValue: boolean
  message: string
  showConfirm?: boolean
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

withDefaults(defineProps<Props>(), {
  showConfirm: true,
  showCancel: true,
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
</script>

<style scoped>
.hint-dialog-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 1280px; height: 720px;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.hint-dialog {
  width: 420px;
  min-height: 200px;
  padding: 32px;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  box-sizing: border-box;
}
.dialog-content {
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px; flex: 1;
}
.dialog-message {
  text-align: center;
  font-size: 22px;
  color: #fff;
  line-height: 32px;
  max-height: 64px;
  overflow: hidden;
  word-break: break-word;
}
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
