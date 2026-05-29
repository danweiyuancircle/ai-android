import type { DefineComponent } from 'vue'
import type { Restrict, EnterTo } from '@dwy/focus-core'

declare const EVirtualList: DefineComponent<
  {
    items: unknown[]
    itemSize: number
    visibleCount: number
    sectionId: string
    focusKeyPrefix?: string
    itemKey?: string | ((item: unknown, index: number) => string | number)
    restrict?: Restrict
    enterTo?: EnterTo
    width?: number | 'auto'
    animate?: boolean
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

export default EVirtualList
