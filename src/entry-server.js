import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

// Rendu serveur du portfolio (one-page, sans router ni données async).
// Tout l'accès aux API navigateur du code vit dans onMounted/handlers,
// donc le rendu serveur n'exécute que les setup() — sûr côté Node.
export async function render() {
  const app = createSSRApp(App)
  return await renderToString(app)
}
