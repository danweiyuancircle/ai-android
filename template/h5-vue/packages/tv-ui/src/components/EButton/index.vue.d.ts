import type { DefineComponent } from 'vue'

declare const EButton: DefineComponent<
  {
    focusKey?: string
    label?: string
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    tag?: string
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

export default EButton
