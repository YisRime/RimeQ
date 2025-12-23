import { createApp } from 'vue'
import { router } from './router'

import 'virtual:uno.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import { MotionPlugin } from '@vueuse/motion'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import App from './App.vue'

const app = createApp(App)

app.use(router)
app.use(MotionPlugin)
app.use(autoAnimatePlugin)
app.use(ToastService)
app.use(ConfirmationService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark'
    }
  }
})

app.mount('#app')
