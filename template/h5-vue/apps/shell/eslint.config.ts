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
              name: "@shell/core/focus",
              message: "业务层禁止直接用焦点框架，请用 @shell/tv-ui 的 EPage/ERow/EColumn/EFocusGroup/EDialog/EFocusable；初始化用 setupTvFocus。",
            },
          ],
          patterns: [
            {
              group: ["@shell/core/focus/*", "**/tv-ui/src/composables/*"],
              message: "焦点框架子路径与 tv-ui 内部 composables 不对业务层开放。",
            },
          ],
        },
      ],
      // 业务模板里可聚焦/可交互元素必须用 tv-ui 组件，禁裸标签——否则不进 SN、焦点不可用
      "vue/no-restricted-html-elements": [
        "error",
        {
          element: ["button", "a", "input", "select", "textarea"],
          message: "可交互元素必须用 @shell/tv-ui 组件（EButton/EFocusable 等），禁裸标签——裸标签不进焦点系统。",
        },
      ],
      "vue/no-restricted-static-attribute": [
        "error",
        {
          key: "tabindex",
          message: "禁手写 tabindex 制造可聚焦元素，请用 <EFocusable> 或对应 tv-ui 组件。",
        },
      ],
      "vue/no-restricted-v-on": [
        "error",
        {
          argument: "click",
          message: "遥控器路径不触发 @click，可聚焦元素的确认请用 tv-ui 组件的 @enter。",
        },
      ],
    },
  },
]);
