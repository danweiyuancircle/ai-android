<template>
  <EFocusGroup
    :id="id"
    :restrict="restrict"
    :enter-to="enterTo"
    :leave-for="leaveFor"
    :default-element="defaultElement"
    :section="section"
    :tag="tag"
    class="e-column"
    :style="flexStyle"
  >
    <slot />
  </EFocusGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EFocusGroup from '../EFocusGroup/index.vue'
import type { Restrict, EnterTo, LeaveFor } from '@shell/core/focus'

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
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
  gap: 16,
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
  flexDirection: 'column' as const,
  gap: `${props.gap}px`,
  justifyContent: props.justify ? AXIS[props.justify] : undefined,
  alignItems: props.align ? AXIS[props.align] : undefined,
}))
</script>
