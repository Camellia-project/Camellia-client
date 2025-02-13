import './assets/main.css'
import router from './router'

import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app
  .use(router)
  .mount('#app')
  .$nextTick(() => {
    // Use contextBridge
    window.electron.ipcRenderer.on('main-process-message', (_event, message) => {
      console.log(message)
    })
  })
  .then((r) => console.log(r))
