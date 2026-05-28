import type { DefineComponent } from 'vue'

declare const Focusable: DefineComponent<
  {
    focusKey?: string
    tag?: string
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any,
  any,
  {
    enter: () => void
    focus: () => void
    blur: () => void
  }
>

export default Focusable
