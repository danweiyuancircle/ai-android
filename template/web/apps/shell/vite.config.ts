import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import legacy from "@vitejs/plugin-legacy";
import { resolve } from "path";
import eslintPlugin from "vite-plugin-eslint";
import fs from "fs";

/**
 * 自定义插件：打包时排除 public 目录中的指定文件（避免把敏感配置打进产物）
 */
function excludePublicFiles(files: string[]) {
  return {
    name: "exclude-public-files",
    closeBundle() {
      files.forEach((file) => {
        const filePath = resolve(__dirname, "dist", file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[exclude-public-files] 已删除: ${file}`);
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // token.json 不进产物
  const excludeFiles = ["token.json"];

  return {
    // TODO: 改成项目专属的 WebView 部署路径，需与 Android 壳加载的 URL 一致
    base: "/app/",
    plugins: [
      vue(),
      legacy({
        // Android 5.1.1 WebView (Chromium 53) 兼容基线；遵 claude/rules/android-webview-5.md
        targets: ["chrome >= 53"],
        modernPolyfills: false,
        // 关键：禁掉 modern chunk，所有设备走 legacy bundle。
        // 原因：plugin-legacy 现代浏览器探测脚本只检测 import.meta.url / 动态 import / async-generator
        // （Chrome 63+ 全部支持），Chrome 66/70 这些"够新到通过探测、又老到缺 globalThis/Promise.allSettled"
        // 的设备会加载没注入 polyfill 的 modern bundle → ReferenceError → 白屏。
        // TV/盒子场景设备分布跨度大，统一走 legacy 最稳，包体增量主要是 polyfills-legacy.js（~67KB gzip 28KB）。
        renderModernChunks: false,
      }),
      eslintPlugin(),
      excludePublicFiles(excludeFiles),
    ],
    resolve: {
      // tv-ui / tv-focus 改用 npm 包 @chancestv/*，其内部 import 的 vue 必须与 app 共用同一实例，
      // 否则跨包 provide/inject 的焦点上下文失效，方向键导航全失灵。
      dedupe: ["vue"],
      alias: {
        "@": resolve(__dirname, "src"),
        // workspace 包以源码参与构建，统一走 app 的 legacy 降级链
        "@shell/core": resolve(__dirname, "../../packages/core/src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5175,
      strictPort: true,
      // TODO: 按项目后端补 proxy，示例：
      // proxy: {
      //   "/app/api": {
      //     target: "https://your-backend.example.com/",
      //     changeOrigin: true,
      //     secure: false,
      //     rewrite: (path) => path.replace(/^\/app/, ""),
      //   },
      // },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  };
});
