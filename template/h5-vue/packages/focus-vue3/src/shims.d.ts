declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // 公开为通用组件类型，下游可以正常 import/挂载
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}
