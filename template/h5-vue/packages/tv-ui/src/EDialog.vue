<template>
  <Teleport to="body" :disabled="!teleport">
    <FocusLayer v-if="modelValue" id="e-dialog" class="e-dialog__mask" @click.self="onMaskClick">
      <EFocusGroup
        restrict="self-only"
        class="e-dialog__panel"
        :style="{ width: typeof width === 'number' ? `${width}px` : width }"
      >
        <div v-if="title" class="e-dialog__title">{{ title }}</div>
        <div class="e-dialog__body"><slot /></div>
        <div class="e-dialog__footer"><slot name="footer" /></div>
      </EFocusGroup>
    </FocusLayer>
  </Teleport>
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue'
import { FocusLayer } from '@dwy/focus-vue3'
import EFocusGroup from './EFocusGroup.vue'
import { useOverlay } from './composables/useOverlay'

interface Props {
  modelValue: boolean
  defaultFocus: string
  title?: string
  closeOnBack?: boolean
  closeOnMaskClick?: boolean
  width?: number | string
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBack: true,
  closeOnMaskClick: true,
  width: 420,
  teleport: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
}>()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onMaskClick() {
  if (props.closeOnMaskClick) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) emit('open')
  },
  { immediate: true },
)

useOverlay({
  modelValue: toRef(props, 'modelValue'),
  defaultFocus: toRef(props, 'defaultFocus'),
  closeOnBack: toRef(props, 'closeOnBack'),
  close,
})
</script>

<style scoped>
.e-dialog__mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.e-dialog__panel {
  padding: 36px 32px 28px;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}
.e-dialog__title {
  font-size: 24px;
  color: #fff;
  margin-bottom: 24px;
  text-align: center;
}
.e-dialog__body {
  width: 100%;
  color: #fff;
}
.e-dialog__footer {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 24px;
}
.e-dialog__footer:empty {
  display: none;
}
</style>
