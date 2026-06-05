import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import '@chancestv/tv-ui/styles/index.css'
import '@chancestv/tv-ui/style.css'
import { OTT_NATIVE_KEYDOWN_EVENT } from '@shell/core'
import { setupTvFocus } from '@chancestv/tv-ui'

// 初始化 spatial-navigation；把 OTT 原生按键事件透传为 keydown
setupTvFocus(OTT_NATIVE_KEYDOWN_EVENT)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
