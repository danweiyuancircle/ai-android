<template>
  <component
    :is="tag"
    ref="elRef"
    class="e-focusable"
    :class="{ 'is-focused': focused }"
    tabindex="-1"
    :disabled="!enabled || undefined"
  >
    <slot :focused="focused" />
  </component>
</template>

<script setup lang="ts">
import { useFocusable } from '@dwy/focus-vue3'

interface Props {
  focusKey: string
  enabled?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  tag: 'div',
})

const emit = defineEmits<{ enter: []; focus: []; blur: [] }>()

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => {
    if (props.enabled) emit('enter')
  },
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})
</script>
