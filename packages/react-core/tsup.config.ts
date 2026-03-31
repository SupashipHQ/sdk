import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/focus-web.ts', 'src/focus-native.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  minify: false,
  target: 'es2020',
  external: ['react', 'react-native', '@supashiphq/javascript-sdk'],
})
