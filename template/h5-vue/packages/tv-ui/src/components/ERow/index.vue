<template>
  <EFocusGroup
    :id="id"
    :restrict="restrict"
    :enter-to="enterTo"
    :leave-for="leaveFor"
    :default-element="defaultElement"
    :section="section"
    :tag="tag"
    class="e-row"
    :style="flexStyle"
  >
    <slot />
  </EFocusGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EFocusGroup from '../EFocusGroup/index.vue'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-vue3'

interface Props {
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  defaultElement?: string
  section?: boolean
  tag?: string
  gap?: number
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  align?: 'start' | 'center' | 'end' | 'stretch'
  wrap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
  gap: 16,
  wrap: false,
})

const AXIS: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  'space-between': 'space-between',
  'space-around': 'space-around',
}

const flexStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'row' as const,
  gap: `${props.gap}px`,
  flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
  justifyContent: props.justify ? AXIS[props.justify] : undefined,
  alignItems: props.align ? AXIS[props.align] : undefined,
}))
</script>
