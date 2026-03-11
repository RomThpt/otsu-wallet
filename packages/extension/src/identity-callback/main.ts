import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '../styles/main.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
