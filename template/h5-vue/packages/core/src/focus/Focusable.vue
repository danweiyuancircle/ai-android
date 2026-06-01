<template>
  <component
    :is="tag"
    ref="elRef"
    class="dwy-focusable"
    :class="{ 'is-focused': focused }"
    tabindex="-1"
  >
    <slot :focused="focused" />
  </component>
</template>

<script setup lang="ts">
import { useFocusable } from './useFocusable'

interface Props {
  /** 业务侧 key，便于调试和脚本聚焦（写到 data-focus-key） */
  focusKey?: string
  /** 包装元素 tag，默认 div */
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
})

const emit = defineEmits<{
  enter: []
  focus: []
  blur: []
}>()

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => emit('enter'),
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})

defineExpose({ elRef, focused })
</script>
