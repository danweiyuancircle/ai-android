<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="hint-dialog-overlay" @click.self="handleCancel">
        <div class="hint-dialog">
          <div class="dialog-content">
            <Text :lines="2" :text="message" class="dialog-message" />
          </div>
          <div class="dialog-buttons">
            <button
              v-if="showConfirm"
              :class="['dialog-btn', 'dialog-btn-primary', { 'is-focused': confirmFocused }]"
              :data-focus-key="confirmKey"
              @click="handleConfirm"
            >{{ confirmText }}</button>
            <button
              v-if="showCancel"
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
import Text from './Text.vue'
import { useFocusable } from '@shell/core'

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

const props = withDefaults(defineProps<Props>(), {
  showConfirm: true,
  showCancel: true,
  confirmText: '确定',
  cancelText: '取消',
})
const emit = defineEmits<Emits>()

const confirmKey = 'hint-confirm-btn'
const cancelKey = 'hint-cancel-btn'
const confirmFocused = ref(false)
const cancelFocused = ref(false)

const { register, unregister, setFocus } = useFocusable()
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
  if (props.showConfirm) {
    register(confirmKey, {
      groupId: 'hint-dialog',
      onFocus: () => (confirmFocused.value = true),
      onBlur: () => (confirmFocused.value = false),
      onEnter: handleConfirm,
      onEdgeLeft: blockEdge, onEdgeRight: blockEdge, onEdgeUp: blockEdge, onEdgeDown: blockEdge,
    })
  }
  if (props.showCancel) {
    register(cancelKey, {
      groupId: 'hint-dialog',
      onFocus: () => (cancelFocused.value = true),
      onBlur: () => (cancelFocused.value = false),
      onEnter: handleCancel,
      onEdgeLeft: blockEdge, onEdgeRight: blockEdge, onEdgeUp: blockEdge, onEdgeDown: blockEdge,
    })
  }
})
onUnmounted(() => {
  unregister(confirmKey)
  unregister(cancelKey)
})

watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    await nextTick()
    setTimeout(() => {
      if (props.showConfirm) setFocus(confirmKey)
      else if (props.showCancel) setFocus(cancelKey)
    }, 100)
  }
})
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
.dialog-fade-enter-active .hint-dialog, .dialog-fade-leave-active .hint-dialog {
  transition: transform 0.3s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to { opacity: 0; }
.dialog-fade-enter-from .hint-dialog, .dialog-fade-leave-to .hint-dialog { transform: scale(0.9); }
</style>
