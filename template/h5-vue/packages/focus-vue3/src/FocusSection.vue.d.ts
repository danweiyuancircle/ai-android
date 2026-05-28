import type { DefineComponent } from 'vue'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-core'

declare const FocusSection: DefineComponent<
  {
    id?: string
    restrict?: Restrict
    enterTo?: EnterTo
    leaveFor?: LeaveFor | null
    straightOnly?: boolean
    rememberSource?: boolean
    tag?: string
  },
  unknown,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  any
>

export default FocusSection
