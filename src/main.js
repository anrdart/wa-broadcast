import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import Toast from 'vue-toastification'
import { MotionPlugin } from '@vueuse/motion'

// Import CSS
import './assets/css/main.css'
import 'vue-toastification/dist/index.css'

const app = createApp(App)

// Configure Toast
const toastOptions = {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
}

app.use(createPinia())
app.use(router)
app.use(Toast, toastOptions)
app.use(MotionPlugin)

app.mount('#app')