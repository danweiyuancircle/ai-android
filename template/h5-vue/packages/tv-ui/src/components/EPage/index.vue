<template>
  <component :is="tag" class="tv-page" :data-sn-section-root="id">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { useEPage } from '../../composables/useEPage'

interface Props {
  id: string
  defaultFocus?: string
  tag?: string
}

const props = withDefaults(defineProps<Props>(), { tag: 'div' })

useEPage(props.id, props.defaultFocus)
</script>
