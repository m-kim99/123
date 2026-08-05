import { defineConfig } from 'vitest/config';

// vite.config.ts 를 재사용하지 않는다 — 그쪽 visualizer 플러그인이 open:true 라
// 테스트를 돌릴 때마다 브라우저가 뜬다. 테스트에는 alias 만 있으면 된다.
export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
