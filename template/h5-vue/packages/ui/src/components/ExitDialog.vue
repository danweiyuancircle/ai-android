<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="exit-dialog-overlay" @click.self="handleCancel">
        <div class="exit-dialog">
          <div class="dialog-title">{{ title }}</div>
          <div class="dialog-buttons">
            <button
              :class="['dialog-btn', 'dialog-btn-primary', { 'is-focused': confirmFocused }]"
              :data-focus-key="confirmKey"
              @click="handleConfirm"
            >{{ confirmText }}</button>
            <button
              :class="['dialog-btn', 'dialog-btn-secondary', { 'is-focused': cancelFocused }]"
              :data-focus-key="cancelKey"
              @click="handleCancel"
            >{{ cancelText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useFocusable } from '@shell/core'

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

const confirmKey = 'exit-confirm-btn'
const cancelKey = 'exit-cancel-btn'
const confirmFocused = ref(false)
const cancelFocused = ref(false)

const { register, unregister, setFocus } = useFocusable()

// 边缘拦截：焦点不离开弹框
const blockEdge = (): boolean => true

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

onMounted(() => {
  register(confirmKey, {
    groupId: 'exit-dialog',
    onFocus: () => (confirmFocused.value = true),
    onBlur: () => (confirmFocused.value = false),
    onEnter: handleConfirm,
    onEdgeLeft: blockEdge, onEdgeRight: blockEdge, onEdgeUp: blockEdge, onEdgeDown: blockEdge,
  })
  register(cancelKey, {
    groupId: 'exit-dialog',
    onFocus: () => (cancelFocused.value = true),
    onBlur: () => (cancelFocused.value = false),
    onEnter: handleCancel,
    onEdgeLeft: blockEdge, onEdgeRight: blockEdge, onEdgeUp: blockEdge, onEdgeDown: blockEdge,
  })
})
onUnmounted(() => {
  unregister(confirmKey)
  unregister(cancelKey)
})

// 弹框打开自动聚焦确定按钮
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    await nextTick()
    setTimeout(() => setFocus(confirmKey), 100)
  }
})
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
.dialog-title {
  font-size: 24px; color: #fff;
  margin-bottom: 28px;
}
.dialog-buttons {
  display: flex; gap: 24px;
}
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

.dialog-fade-enter-active, .dialog-fade-leave-active { transition: opacity 0.3s ease; }
.dialog-fade-enter-active .exit-dialog, .dialog-fade-leave-active .exit-dialog {
  transition: transform 0.3s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to { opacity: 0; }
.dialog-fade-enter-from .exit-dialog, .dialog-fade-leave-to .exit-dialog { transform: scale(0.9); }
</style>
