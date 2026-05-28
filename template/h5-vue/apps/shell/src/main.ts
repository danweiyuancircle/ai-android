import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import '@shell/ui/styles/index.css'
import { loadConfig } from '@shell/core'

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

