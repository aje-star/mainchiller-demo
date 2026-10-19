import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],

  base: '/mainchiller-demo/',

  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(
          new URL('./index.html', import.meta.url),
        ),
        demo3d: fileURLToPath(
          new URL('./demo3d.html', import.meta.url),
        ),
      },
    },
  },
})