<template>
  <div
    :class="[
      'focusable-card',
      'focusable-base',
      'focus-border-animated',
      'focused-inner-scale',
      { 'focused-default': isFocused }
    ]"
    :data-focus-key="focusKey"
    @click="handleClick"
  >
    <div class="card-image">
      <img :src="data.image" :alt="data.title" class="inner-element" />
    </div>
    <div class="card-content">
      <h3>{{ data.title }}</h3>
      <p>{{ data.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFocusable } from '@shell/core'

interface Props {
  focusKey: string
  data: {
    id: number
    title: string
    image: string
    description: string
  }
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
.focusable-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--focus-border-radius);
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 350px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: 20px;
}

.card-content h3 {
  font-size: 24px;
  color: #fff;
  margin-bottom: 10px;
}

.card-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}
</style>

