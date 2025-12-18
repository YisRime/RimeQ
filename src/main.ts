import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'

import { MotionPlugin } from '@vueuse/motion'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import 'virtual:uno.css'
import './assets/styles/main.scss'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(MotionPlugin)
app.use(autoAnimatePlugin)

app.mount('#app')
