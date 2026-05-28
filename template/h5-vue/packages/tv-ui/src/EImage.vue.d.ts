import type { DefineComponent } from 'vue'

declare const EImage: DefineComponent<
  {
    focusKey?: string
    src: string
    alt?: string
    lazy?: boolean
    lazyDelay?: number
    width?: string | number
    height?: string | number
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

export default EImage
