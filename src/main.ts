import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import './assets/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')

// Een nieuwe versie wordt vanzelf geïnstalleerd en de pagina laadt dan opnieuw.
// Een geïnstalleerde app staat vaak dagen op de achtergrond; daarom controleren we
// ook op updates zodra je terugkomt in de app.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})
