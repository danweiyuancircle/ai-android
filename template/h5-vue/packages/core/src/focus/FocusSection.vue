<template>
  <component :is="tag" class="dwy-focus-section" :data-sn-section-root="sectionId">
    <slot :sectionId="sectionId" />
  </component>
</template>

<script setup lang="ts">
import { useFocusSection } from './useFocusSection'
import type { Restrict, EnterTo, LeaveFor } from './engine'

interface Props {
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  straightOnly?: boolean
  rememberSource?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  straightOnly: false,
  rememberSource: true,
  tag: 'div',
})

const { sectionId } = useFocusSection({
  id: props.id,
  restrict: props.restrict,
  enterTo: props.enterTo,
  leaveFor: props.leaveFor,
  straightOnly: props.straightOnly,
  rememberSource: props.rememberSource,
})
</script>
