# ES5 / ES2015 + polyfill 打包配置审计

## 前置说明（重要）：到底要不要 ES5？

**真要降到字面 ES5 的场景几乎不存在。** Chrome 53+ 已支持 ES2015 (ES6) 绝大部分语法。机顶盒"向下兼容"的实操标准是：

```
ES2015 + Babel/SWC 把 async/await 等少数 ES2017+ 语法降到 ES2015
        + core-js 补运行时 API polyfill
        + nomodule 兜底（Chrome 53 不支持 <script type="module">）
```

降到字面 ES5 的代价：
- 产物大 30-50%（class → 构造函数原型、let/const → var + IIFE、模板字符串 → 字符串拼接、解构 → 多行赋值）
- 启动慢（更多代码要 parse + execute）
- 收益低（Chrome 53 原生跑 ES2015 已经很快）

**例外**：Chrome 30-48（Android 4.4 KitKat 出厂 WebView）不能升级 WebView 的设备，才需要真 ES5。这类设备建议直接放弃，工作量超过收益。

skill 在以下章节把"ES5 打包"理解为这个实操标准。如果用户坚持字面 ES5，章节最后有"硬 ES5 模式"配方。

---

## 一、审计清单（6 项）

按顺序检查项目根（用 Read / Bash 工具）：

### 1. `package.json` 的 `browserslist`

**应有**：

```json
{
  "browserslist": [
    "chrome >= 53",
    "android >= 5.1"
  ]
}
```

**检查方法**：

```bash
grep -A5 '"browserslist"' /项目根/package.json
# 或
cat /项目根/.browserslistrc 2>/dev/null
```

**问题诊断**：

- 缺失 → PostCSS / autoprefixer / eslint-plugin-compat 等会用默认值（通常是 "last 2 versions"），不覆盖老 WebView
- 写错版本号（如 `"chrome >= 80"` 但目标 chrome53）→ 立即修正
- 同时存在 `package.json` 字段和 `.browserslistrc` → 删掉一处，保留一处（避免混乱）

### 2. 构建工具 target

#### Vite 项目

读 `vite.config.ts` / `vite.config.js` / `vite.config.mts`：

**应有**：

```ts
export default defineConfig({
  build: {
    target: 'es2015',          // esbuild 语法降级
    cssTarget: 'chrome53'      // 让 CSS 不输出 #rrggbbaa 等新语法
  },
  plugins: [
    legacy({                    // 必装
      targets: ['chrome >= 53', 'android >= 5.1'],
      additionalLegacyPolyfills: [
        'resize-observer-polyfill/dist/ResizeObserver.global'
      ],
      modernPolyfills: false,   // 只产 legacy bundle
      renderLegacyChunks: true,
      polyfills: true
    })
  ]
})
```

**关键问题**：

- `build.target` 设了 `'es2020'` 或更新 → 改成 `'es2015'`
- 缺 `@vitejs/plugin-legacy` → 立即装：`npm i -D @vitejs/plugin-legacy@5.x`
- `plugin-legacy` 的 `targets` 没显式写 → 必须写（它**不读** `package.json` 的 `browserslist`）
- Vite 6 + `@vitejs/plugin-legacy@6.x` → 配置改用 SWC，注意按新版文档配；若想稳定，降到 Vite 5 + plugin-legacy 5

#### Webpack 项目

读 `webpack.config.js` / `webpack.config.ts`：

**应有**：

```js
module.exports = {
  output: {
    environment: {
      arrowFunction: false,    // 不输出 ES6 箭头函数（仅例子，按目标定）
      const: false,
      destructuring: false,
      // ... 其余按 chrome53 能力开
    }
  },
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {
              targets: { chrome: '53', android: '5.1' },
              useBuiltIns: 'usage',
              corejs: 3
            }]
          ]
        }
      }
    }]
  }
}
```

#### Rspack / Turbopack / Parcel 项目

按对应配置项找 target。原则一致：把目标设为 chrome53/66/80 等档位，确保打通 Babel/SWC + core-js polyfill。

### 3. `tsconfig.json` 的 `compilerOptions.target`

**应有**：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

**为什么是 ES2020 而非 ES2015**：

- tsc 只降语法**不补 polyfill**（甚至 ES2015 target 也不会给你补 Promise）
- 真正降级靠下游：Vite legacy / Babel / SWC
- ES2020 让 IDE 类型检查不报错（结构化语法都 OK），开发体验好
- `lib` 设 `ES2020` 让你用 `Promise.allSettled` 等的类型签名时不被 tsc 拒绝

**问题诊断**：

- target 设到 `ES5` → 改 `ES2020`（tsc 降级反而拖累开发体验，且最终降级不归它管）
- `module` 是 `CommonJS` → 改 `ESNext` 让 Vite/Webpack 能 tree-shake

### 4. `@vitejs/plugin-legacy` 是否安装与配置

**机顶盒项目必装。** 缺了会发生：

- 产物里 `Promise.allSettled()`、`structuredClone()` 等调用在 Chrome 53 上直接 `ReferenceError`
- 没有 nomodule bundle，Chrome 53 不能加载 `<script type="module">`

**检查命令**：

```bash
# 是否在 devDependencies
grep '@vitejs/plugin-legacy' /项目根/package.json

# vite.config 里是否引用了
grep 'legacy' /项目根/vite.config.*
```

### 5. `core-js` 版本

**应有**：

- 在 `dependencies`（不能只在 devDependencies，否则 legacy bundle 体积优化时被剔）
- 版本 `^3.36+`（更早可能没 `Promise.withResolvers` polyfill；虽然机顶盒锁版本避开了 Vue 3.5，但 core-js 装新版无害）

**检查**：

```bash
grep -E '"core-js"' /项目根/package.json
```

### 6. 源码已用的"超档位 API"扫描

用 grep 扫一遍 `src/`，避免开发时不小心写了超档位 API（CI 加上更稳）：

```bash
cd /项目根/src
# 一次性扫所有高风险 API
grep -nE 'structuredClone\(|\.withResolvers\(|Object\.hasOwn\(|\.findLast\(|\.findLastIndex\(|\.at\(-?[0-9]+\)|AbortSignal\.timeout|new ResizeObserver|URL\.canParse|\.replaceAll\(' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' -r .
```

每条匹配都要核对：

- 若有 `@vitejs/plugin-legacy` + `additionalLegacyPolyfills` 覆盖 → OK
- 若 core-js 已 polyfill（如 `structuredClone` 在 core-js 3.20+） → OK
- 若都没覆盖 → **标红**，要么改代码用替代写法，要么补 polyfill

CSS 扫一遍：

```bash
grep -nrE ':is\(|:where\(|:has\(|aspect-ratio|container-type|@container|gap:|@layer|color-mix\(|dvh|svh|lvh|@property|accent-color' /项目根/src --include='*.css' --include='*.scss' --include='*.vue'
```

## 二、审计报告模板

```markdown
# 项目 ES5/ES2015 + polyfill 兼容审计报告

**项目根**：/Users/xxx/project
**目标 Chrome 档位**：53（Android 5.1.1）
**审计日期**：YYYY-MM-DD

## 一、当前状态

| 检查项 | 当前值 | 状态 |
|---|---|---|
| `package.json` browserslist | `["chrome >= 53"]` | ✅ |
| Vite `build.target` | `'es2020'` | ❌ 偏新 |
| Vite `cssTarget` | 未设 | ⚠️ 建议补 |
| `@vitejs/plugin-legacy` | 未安装 | ❌ 必装 |
| `tsconfig` target | `ES5` | ⚠️ 建议改 ES2020 |
| `core-js` 版本 | `^3.32` | ⚠️ 建议升 ^3.36 |
| 源码超档位 API | 检出 12 处（详见下） | ❌ |

## 二、不符合项详情与修复

### ❌ Vite build.target 偏新

**当前**：`build.target: 'es2020'`（`vite.config.ts:8`）

**修复**：

```ts
// vite.config.ts
build: {
  target: 'es2015',
  cssTarget: 'chrome53'
}
```

### ❌ 缺 @vitejs/plugin-legacy

**当前**：未安装

**修复**：

```bash
npm i -D @vitejs/plugin-legacy@5.x
```

```ts
// vite.config.ts
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    // ...
    legacy({
      targets: ['chrome >= 53', 'android >= 5.1'],
      additionalLegacyPolyfills: [
        'resize-observer-polyfill/dist/ResizeObserver.global'
      ],
      modernPolyfills: false,
      renderLegacyChunks: true,
      polyfills: true
    })
  ]
})
```

### ❌ 源码超档位 API（12 处）

| 文件:行 | API | since Chrome | 建议 |
|---|---|---|---|
| src/utils/clone.ts:5 | `structuredClone(obj)` | 98 | 改 `rfdc()(obj)` 或 polyfill |
| src/api/chat.ts:42 | `arr.at(-1)` | 92 | 改 `arr[arr.length - 1]` |
| src/composables/useSize.ts:8 | `new ResizeObserver` | 64 | 装 `resize-observer-polyfill` |
| ... | ... | ... | ... |

## 三、下一步行动（按优先级）

### 🔴 高优先级（不修上线即炸）

1. 安装 `@vitejs/plugin-legacy@5.x` 并配置（5 分钟）
2. 改 `vite.config.ts` `build.target` 为 `es2015`（1 分钟）
3. 改 `src/utils/clone.ts` 的 `structuredClone` 用法（10 分钟）

### 🟡 中优先级（影响开发体验）

4. 改 `tsconfig.json` target 为 `ES2020`
5. 升级 `core-js` 到 `^3.36`

### 🟢 低优先级（健壮性增强）

6. 加 CI grep 检查防止后续引入超档位 API
7. 加 `eslint-plugin-compat` 静态检查
```

## 三、修复后真机验证

修复完一定要：

```bash
# 1. 重新构建
npm run build

# 2. 检查产物是否产出 nomodule 兜底
grep -c 'nomodule' dist/index.html
# 应 >= 1

# 3. 检查产物是否有 polyfill chunk
ls -la dist/assets/polyfills-legacy-*.js
# 应存在

# 4. adb push 到目标盒子真机
adb push dist /sdcard/test-dist
# 或部署到测试 OTT 基座

# 5. 真机打开应用，DevTools (chrome://inspect) 看 console 无错
```

## 四、硬 ES5 模式（极少用，谨慎选用）

若客户机型是 Android 4.4 KitKat（出厂 WebView Chromium ~30，不能升级），可能确实要真 ES5：

```ts
// vite.config.ts
build: {
  target: 'es5',                    // ⚠️ 产物大 30%+
},
plugins: [
  legacy({
    targets: ['chrome >= 30'],      // 极冷酷
    additionalLegacyPolyfills: [
      'core-js/stable',
      'regenerator-runtime/runtime',
      'whatwg-fetch'                // chrome30 fetch 也没有
    ],
    polyfills: true,
    renderLegacyChunks: true,
    modernPolyfills: false,
    ignoreBrowserslistConfig: false
  })
]
```

并要：

- 禁用所有 ES6 模板字符串、解构、箭头函数（让 Babel 全降）
- 禁用 fetch（用 axios XHR 适配器）
- 禁用 Promise（用 es6-promise polyfill 全注入）
- 禁用 CSS Grid（用 Flex 布局）

**强烈建议**：先和甲方确认设备分布，能放弃 KitKat 就放弃。

## 五、CI 集成（强力推荐）

加 `.github/workflows/compat-check.yml` 或同等 CI：

```yaml
name: STB Compat Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Grep 超档位 API
        run: |
          ! grep -rnE 'structuredClone\(|\.withResolvers\(|Object\.hasOwn\(|\.findLast\(|\.at\(-?[0-9]+\)|AbortSignal\.timeout' src/ --include='*.ts' --include='*.tsx' --include='*.vue'
      - name: 验证 vite legacy 配置
        run: grep -q '@vitejs/plugin-legacy' vite.config.ts
      - name: 验证 browserslist
        run: grep -q '"chrome >= 53"\|"chrome >= 66"' package.json
```

让超档位 API 进不来主分支。
