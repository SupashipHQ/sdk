import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  minify: false,
  target: 'es2020',
  external: ['@angular/core', '@angular/common', 'rxjs'], // Mark Angular and RxJS as external
})
