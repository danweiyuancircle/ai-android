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
export default defineConfig(({ mode }) => {
  // token.json 不进产物；按 mode 排除另一套环境配置
  const excludeFiles = ["token.json"];
  if (mode === "prod") {
    excludeFiles.push("test-config.json");
  } else if (mode === "test") {
    excludeFiles.push("prod-config.json");
  }

  return {
    // TODO: 改成项目专属的 WebView 部署路径，需与 Android 壳加载的 URL 一致
    base: "/app/",
    plugins: [
      vue(),
      legacy({
        // Android 5.1.1 WebView (Chromium 53) 兼容基线；遵 claude/rules/android-webview-5.md
        targets: ["chrome >= 53"],
        modernPolyfills: false,
      }),
      eslintPlugin(),
      excludePublicFiles(excludeFiles),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
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
