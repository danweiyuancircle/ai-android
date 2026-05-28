<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="exit-dialog-overlay" @click.self="handleCancel">
        <div class="exit-dialog">
          
          <!-- 按钮组 -->
          <div class="dialog-buttons">
            <!-- 确定按钮 -->
            <FocusableImage
              focus-key="exit-confirm-btn"
              group-id="exit-dialog"
              :src="'img/exit/btn_enter.png'"
              alt="确定"
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
              focus-key="exit-cancel-btn"
              group-id="exit-dialog"
              :src="'img/exit/btn_cancel.png'"
              alt="取消"
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
import { useFocusable } from '@shell/core'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { setFocus } = useFocusable()

// 监听弹框显示状态，自动聚焦到确定按钮
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    // 等待DOM渲染完成后设置焦点
    await nextTick()
    setTimeout(() => {
      setFocus('exit-confirm-btn')
    }, 100)
  }
})

// 确定退出
const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}

// 取消退出
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

const handleEdgeLeft = ():boolean => {
  console.log('handleEdgeLeft')
  return true
}

const handleEdgeRight = ():boolean => {
  console.log('handleEdgeRight')
  return true
}

const handleEdgeUp = ():boolean => {
  console.log('handleEdgeUp')
  return true
}

const handleEdgeDown = ():boolean => {
  console.log('handleEdgeDown')
  return true
}
</script>

<style scoped>
/* 遮罩层 */
.exit-dialog-overlay {
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
.exit-dialog {
  width: 470px;
  height: 240px;
  background: url('/img/exit/bg_exit.png') no-repeat center center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}


/* 按钮组 */
.dialog-buttons {
  display: flex;
  margin-left: 115px;
  margin-top: 100px;
  /* align-items: center;
  justify-content: center; */
}

.dialog-buttons > *:not(:first-child) {
  margin-left: 24px;
}

.dialog-button {
  cursor: pointer;
  width: 94px;
  height: 39px;
  overflow: visible;
  border: 0px solid transparent;
  border-radius: 0;
  /* transition: all 0.3s ease; */
}

.dialog-button:deep(.focusable-image.focused-default) {
  transform: scale(1.1);
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .exit-dialog,
.dialog-fade-leave-active .exit-dialog {
  transition: transform 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .exit-dialog,
.dialog-fade-leave-to .exit-dialog {
  transform: scale(0.9);
}
</style>

