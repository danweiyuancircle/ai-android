import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginVue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    ignores: ["dist/**", "node_modules/**", "src/**/*.d.ts"],
  },
  {
    rules: {
      "import/no-unresolved":"off",
      "vue/multi-word-component-names": "off",
      "vue/no-unused-vars": "off",
      "vue/no-undef-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const":"off",
      "no-case-declarations":"off",
    },
  },
  {
    files: ["src/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@dwy/focus-vue3",
              message: "业务层禁止直接用焦点框架，请用 @dwy/tv-ui 的 EPage/ERow/EColumn/EFocusGroup/EDialog/EFocusable；初始化用 setupTvFocus。",
            },
          ],
          patterns: [
            {
              group: ["@dwy/focus-vue3/*", "**/tv-ui/src/composables/*"],
              message: "焦点框架子路径与 tv-ui 内部 composables 不对业务层开放。",
            },
          ],
        },
      ],
    },
  },
]);
