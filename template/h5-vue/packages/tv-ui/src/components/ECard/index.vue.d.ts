import type { DefineComponent } from 'vue'

declare const ECard: DefineComponent<
  {
    focusKey?: string
    title?: string
    description?: string
    image?: string
    width?: number | string
    imageRatio?: number
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

export default ECard
