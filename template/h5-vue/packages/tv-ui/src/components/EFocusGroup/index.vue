<template>
  <component :is="tag" class="e-focus-group" :data-sn-section-root="sectionId">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { useFocusSection } from '@dwy/focus-vue3'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-vue3'

interface Props {
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  defaultElement?: string
  section?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
})

// 注：section / restrict / enterTo / leaveFor / defaultElement 在 mount 时读取一次，
// 不支持运行期动态变更（与 @dwy/focus-vue3 的 FocusSection 行为一致）。
let sectionId = ''
if (props.section) {
  const ctx = useFocusSection({
    id: props.id,
    restrict: props.restrict,
    enterTo: props.enterTo,
    leaveFor: props.leaveFor,
    defaultElement: props.defaultElement,
  })
  sectionId = ctx.sectionId
}
</script>
