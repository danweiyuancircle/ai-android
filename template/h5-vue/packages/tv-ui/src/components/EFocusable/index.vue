<template>
  <component
    :is="tag"
    ref="elRef"
    class="e-focusable"
    :class="{ 'is-focused': focused }"
    tabindex="-1"
    :disabled="enabled ? undefined : true"
  >
    <slot :focused="focused" />
  </component>
</template>

<script setup lang="ts">
import { useFocusable } from '@shell/core/focus'

interface Props {
  focusKey: string
  /** false 时占位但不参与焦点：渲染 disabled 属性，focus-core isNavigable 见之即跳过 */
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
