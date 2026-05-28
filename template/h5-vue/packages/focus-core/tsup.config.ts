import { defineConfig } from 'tsup'

const BANNER = `/*!
 * @dwy/focus-core
 *
 * Includes code from luke-chang/js-spatial-navigation (MPL 2.0).
 * Original copyright (c) 2022 Luke Chang. See LICENSE / ATTRIBUTION.md.
 */`

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'chrome53',
  treeshake: true,
  banner: { js: BANNER },
})
