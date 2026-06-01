<template>
  <EDialog
    v-model="open"
    :default-focus="defaultFocusKey"
    :width="420"
    @close="handleBackOrMaskClose"
  >
    <EText :lines="2" :text="message" class="hint-message" />
    <template #footer>
      <EButton
        v-if="showConfirm"
        focus-key="hint-confirm-btn"
        variant="primary"
        :label="confirmText"
        @enter="handleConfirm"
      />
      <EButton
        v-if="showCancel"
        focus-key="hint-cancel-btn"
        variant="secondary"
        :label="cancelText"
        @enter="handleCancel"
      />
    </template>
  </EDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EText from '../EText/index.vue'
import EDialog from '../EDialog/index.vue'
import EButton from '../EButton/index.vue'

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

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const defaultFocusKey = computed(() =>
  props.showConfirm ? 'hint-confirm-btn' : 'hint-cancel-btn',
)

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
const handleBackOrMaskClose = () => emit('cancel')
</script>

<style scoped>
.hint-message {
  text-align: center;
  font-size: 22px;
  color: #fff;
  line-height: 32px;
}
</style>
