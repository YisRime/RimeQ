import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'virtual:uno.css'

import { MotionPlugin } from '@vueuse/motion'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())

app.use(MotionPlugin)
app.use(autoAnimatePlugin)

app.mount('#app')
