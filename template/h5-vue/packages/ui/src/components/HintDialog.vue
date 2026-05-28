<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="hint-dialog-overlay" @click.self="handleCancel">
        <div class="hint-dialog">
          <!-- 提示文字区域 -->
          <div class="dialog-content">
            <Text :lines="2" :text="message" class="dialog-message" />
          </div>

          <!-- 按钮组 -->
          <div class="dialog-buttons">
            <!-- 确定按钮 -->
            <FocusableImage
              v-if="showConfirm"
              focus-key="hint-confirm-btn"
              group-id="hint-dialog"
              :src="confirmIcon"
              :alt="confirmText"
              :lazy="false"
              class="dialog-button"
              :on-edge-left="handleEdgeLeft"
              :on-edge-right="handleEdgeRight"
              :on-edge-up="handleEdgeUp"
              :on-edge-down="handleEdgeDown"
              @click="handleConfirm"
              :hide-focus-border="true"
            />

            <!-- 取消按钮 -->
            <FocusableImage
              v-if="showCancel"
              focus-key="hint-cancel-btn"
              group-id="hint-dialog"
              :src="cancelIcon"
              :alt="cancelText"
              :lazy="false"
              :on-edge-left="handleEdgeLeft"
              :on-edge-right="handleEdgeRight"
              :on-edge-up="handleEdgeUp"
              :on-edge-down="handleEdgeDown"
              class="dialog-button"
              @click="handleCancel"
              :hide-focus-border="true"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, nextTick } from 'vue'
import FocusableImage from './FocusableImage.vue'
import Text from './Text.vue'
import { useFocusable } from '@shell/core'

interface Props {
  modelValue: boolean
  message: string
  showConfirm?: boolean
  showCancel?: boolean
  confirmIcon?: string
  cancelIcon?: string
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
  confirmIcon: 'img/exit/btn_enter.png',
  cancelIcon: 'img/exit/btn_cancel.png',
  confirmText: '确定',
  cancelText: '取消',
})

const emit = defineEmits<Emits>()

const { setFocus } = useFocusable()

// 监听弹框显示状态，自动聚焦到确定按钮
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    // 等待DOM渲染完成后设置焦点
    await nextTick()
    setTimeout(() => {
      // 优先聚焦到确定按钮，如果没有确定按钮则聚焦到取消按钮
      if (props.showConfirm) {
        setFocus('hint-confirm-btn')
      } else if (props.showCancel) {
        setFocus('hint-cancel-btn')
      }
    }, 100)
  }
})

// 确定
const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}

// 取消
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

const handleEdgeLeft = (): boolean => {
  console.log('handleEdgeLeft')
  return true
}

const handleEdgeRight = (): boolean => {
  console.log('handleEdgeRight')
  return true
}

const handleEdgeUp = (): boolean => {
  console.log('handleEdgeUp')
  return true
}

const handleEdgeDown = (): boolean => {
  console.log('handleEdgeDown')
  return true
}
</script>

<style scoped>
/* 遮罩层 */
.hint-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 1280px;
  height: 720px;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* 弹框容器 */
.hint-dialog {
  width: 470px;
  min-height: 240px;
  background: url('/img/ic_hint_bg.png') no-repeat center center;
  background-size: 100% 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 30px;
  box-sizing: border-box;
}

/* 内容区域 */
.dialog-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  font-weight: bold;
  flex: 1;
}

.dialog-message {
  text-align: center;
  font-size: 24px;
  color: #333;
  line-height: 36px;
  max-height: 72px;
  overflow: hidden;
  word-break: break-word;
}

/* 按钮组 */
.dialog-buttons { 
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
}

.dialog-buttons > *:not(:first-child) {
  margin-left: 56px;
}

.dialog-button {
  cursor: pointer;
  width: 94px;
  height: 39px;
  overflow: visible;
  border: 0px solid transparent;
  border-radius: 0;
}

.dialog-button:deep(.focusable-image.focused-default) {
  transform: scale(1.1);
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .hint-dialog,
.dialog-fade-leave-active .hint-dialog {
  transition: transform 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .hint-dialog,
.dialog-fade-leave-to .hint-dialog {
  transform: scale(0.9);
}
</style>

