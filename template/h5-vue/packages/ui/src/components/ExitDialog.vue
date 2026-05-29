<template>
  <EDialog
    v-model="open"
    :title="title"
    default-focus="exit-confirm-btn"
    :width="420"
    @close="handleMaskOrBackClose"
  >
    <template #footer>
      <EButton focus-key="exit-confirm-btn" variant="primary" :label="confirmText" @enter="handleConfirm" />
      <EButton focus-key="exit-cancel-btn" variant="secondary" :label="cancelText" @enter="handleCancel" />
    </template>
  </EDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDialog, EButton } from '@dwy/tv-ui'

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

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
const handleMaskOrBackClose = () => emit('cancel')
</script>
