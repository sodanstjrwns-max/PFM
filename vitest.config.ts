import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node', // Web Crypto 는 Node 18+ 전역 제공
    globals: false,
  },
})
