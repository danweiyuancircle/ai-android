<template>
  <component
    :is="tag"
    ref="elRef"
    class="tv-focusable e-button"
    :class="[`e-button--${variant}`, `e-button--${size}`, { 'is-focused': focused, 'is-disabled': disabled }]"
    @click="handleClick"
  >
    <slot>
      <span class="e-button__text">{{ label }}</span>
    </slot>
  </component>
</template>

<script setup lang="ts">
import { useFocusable } from '@shell/core/focus'

interface Props {
  focusKey?: string
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  tag: 'button',
})

const emit = defineEmits<{
  enter: []
  click: []
  focus: []
  blur: []
}>()

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => {
    if (props.disabled) return
    emit('enter')
  },
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})

function handleClick() {
  if (props.disabled) return
  emit('click')
}
</script>

<style scoped>
.e-button {
  border: 0;
  border-radius: var(--tv-radius);
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  text-align: center;
  white-space: nowrap;
}
.e-button.is-disabled { opacity: 0.4; cursor: not-allowed; }

.e-button--sm { padding: 8px 14px; font-size: 14px; }
.e-button--md { padding: 12px 22px; font-size: 16px; }
.e-button--lg { padding: 16px 28px; font-size: 18px; }

.e-button--primary { background: var(--tv-color-focus); color: #0b1220; }
.e-button--secondary { background: var(--tv-color-surface); color: var(--tv-color-text); }
.e-button--ghost { background: transparent; color: var(--tv-color-text); }
.e-button--danger { background: var(--tv-color-error); color: #0b1220; }
</style>
