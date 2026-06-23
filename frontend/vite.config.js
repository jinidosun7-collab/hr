// vite.config.js
// Vite(개발 서버 + 빌드 도구) 설정 파일.
// React를 쓸 수 있게 plugin-react 를 켜준다.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 개발 서버 주소: http://localhost:5173
  },
})
