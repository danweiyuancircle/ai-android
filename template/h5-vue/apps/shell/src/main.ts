import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import '@shell/ui/styles/index.css'
import '@dwy/tv-ui/style.css'
import { loadConfig, OTT_NATIVE_KEYDOWN_EVENT } from '@shell/core'
import { setupTvFocus } from '@dwy/tv-ui'

// 初始化 spatial-navigation；把 OTT 原生按键事件透传为 keydown
setupTvFocus(OTT_NATIVE_KEYDOWN_EVENT)

// 先加载配置，再启动应用
loadConfig().then(() => {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
  console.log('应用启动完成')
}).catch(error => {
  console.error('配置加载失败，应用无法启动:', error)
})
