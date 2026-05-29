<template>
  <Teleport to="body" :disabled="!teleport">
    <div v-if="modelValue" :class="['e-toast', `e-toast--${placement}`]">
      {{ message }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

interface Props {
  modelValue: boolean
  message: string
  duration?: number
  placement?: 'top' | 'center' | 'bottom'
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000,
  placement: 'bottom',
  teleport: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

let timer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.modelValue,
  (open) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (open && props.duration > 0) {
      timer = setTimeout(() => emit('update:modelValue', false), props.duration)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.e-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  padding: 14px 28px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 20px;
  border-radius: 8px;
  z-index: 10000;
  pointer-events: none;
  text-align: center;
}
.e-toast--top { top: 48px; }
.e-toast--center { top: 50%; transform: translate(-50%, -50%); }
.e-toast--bottom { bottom: 64px; }
</style>
