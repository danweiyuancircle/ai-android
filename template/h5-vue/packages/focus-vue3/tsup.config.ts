import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    native: 'src/key-source/native-event.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'chrome53',
  external: ['vue', '@dwy/focus-core'],
  treeshake: true,
  loader: {
    '.vue': 'copy',
  },
})
