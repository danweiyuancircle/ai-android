<template>
  <button
    :class="[
      'focusable-button',
      'focusable-base',
      'focus-border-animated',
      { 'focused-gradient': isFocused }
    ]"
    :data-focus-key="focusKey"
    @click="handleClick"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFocusable } from '@/composables/useFocusManager'

interface Props {
  focusKey: string
}

const props = defineProps<Props>()
const emit = defineEmits(['click'])

const isFocused = ref(false)

const { register, unregister } = useFocusable()

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}

const handleClick = () => {
  emit('click')
}

onMounted(() => {
  register(props.focusKey, {
    onFocus: handleFocus,
    onBlur: handleBlur,
    onEnter: handleClick
  })
})

onUnmounted(() => {
  unregister(props.focusKey)
})
</script>

<style scoped>
.focusable-button {
  padding: 15px 30px;
  font-size: 20px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--focus-border-radius);
}
</style>

