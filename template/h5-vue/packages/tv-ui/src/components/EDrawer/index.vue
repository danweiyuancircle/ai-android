<template>
  <Teleport to="body" :disabled="!teleport">
    <FocusLayer v-if="modelValue" id="e-drawer" class="e-drawer__mask" @click.self="onMaskClick">
      <EFocusGroup
        restrict="self-only"
        :class="['e-drawer__panel', `e-drawer__panel--${placement}`]"
        :style="panelStyle"
      >
        <div v-if="title" class="e-drawer__title">{{ title }}</div>
        <div class="e-drawer__body"><slot /></div>
        <div class="e-drawer__footer"><slot name="footer" /></div>
      </EFocusGroup>
    </FocusLayer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import { FocusLayer } from '@shell/core/focus'
import EFocusGroup from '../EFocusGroup/index.vue'
import { useOverlay } from '../../composables/useOverlay'

interface Props {
  modelValue: boolean
  defaultFocus: string
  title?: string
  closeOnBack?: boolean
  closeOnMaskClick?: boolean
  teleport?: boolean
  placement?: 'left' | 'right' | 'top' | 'bottom'
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBack: true,
  closeOnMaskClick: true,
  teleport: true,
  placement: 'right',
  size: 360,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
}>()

const sizeCss = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
const panelStyle = computed(() => {
  const horizontal = props.placement === 'left' || props.placement === 'right'
  return horizontal ? { width: sizeCss.value, height: '100%' } : { width: '100%', height: sizeCss.value }
})

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
.e-drawer__mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}
.e-drawer__panel {
  position: absolute;
  background: #2a2a2a;
  box-shadow: 0 0 32px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.e-drawer__panel--right { top: 0; right: 0; }
.e-drawer__panel--left { top: 0; left: 0; }
.e-drawer__panel--top { top: 0; left: 0; }
.e-drawer__panel--bottom { bottom: 0; left: 0; }
.e-drawer__title { font-size: 22px; color: #fff; margin-bottom: 16px; }
.e-drawer__body { flex: 1; color: #fff; overflow: auto; }
.e-drawer__footer { display: flex; gap: 16px; margin-top: 16px; }
.e-drawer__footer:empty { display: none; }
</style>
