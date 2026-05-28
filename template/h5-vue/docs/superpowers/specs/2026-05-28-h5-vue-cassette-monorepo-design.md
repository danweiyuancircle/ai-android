# h5-vue 卡带架构（pnpm monorepo）设计

- 日期：2026-05-28
- 目标：把 `template/h5-vue/` 单包 TV 壳改造成 pnpm workspace monorepo，参考 `ai-quant/quant-cloud/frontend` 的分层与"可复用 feature 工厂"模式，把业务领域做成可插拔的"卡带"。
- 范围：搭 monorepo 骨架 + 现有 views 迁移 + core/ui 包接口 + 一盘 feature 卡带样板。**只搭骨架接口，不重写任何 UI / 业务逻辑**。

## 1. 决策摘要

| 维度 | 决策 |
|---|---|
| 卡带粒度 | 业务领域 = 1 卡带（对标 `@dwy/features-auth`） |
| 切包方案 | A 四层：`apps/shell` + `@shell/core` + `@shell/ui` + `@shell/feature-aichat` |
| 包名 scope | `@shell/*`（中性，模板可被任意下游拷贝；不用 ai-quant 的 `@dwy`） |
| 首盘卡带 | `AIChat` 业务（bridge 拉起）抽成 `@shell/feature-aichat` |
| 壳内置页 | `Home` / `Detail` / `ComingSoon` 留 `apps/shell/src/pages/`，不套工厂 |

## 2. 可行性结论

可行，契合度高。现有代码已是清晰的"基建 / 业务"二分，搬进 monorepo 基本是平移，不重写逻辑。

三个必须正视的约束（与 ai-quant 不同）：

1. **版本锁低，不照搬 catalog**：h5-vue 是 Chromium 53 / Chrome 66 兼容壳，锁 `vue 3.4 / vite 5 / pinia 2 / @vitejs/plugin-legacy 5 / terser`。ai-quant 的 `vue 3.5 / vite 8 / pinia 3` 禁止搬入。
2. **全局单例跨包**：`FocusManager`（class 单例）、`window.ottService`、pinia config store 必须全仓单实例，靠 pnpm + catalog 锁单版本 `vue/pinia/vue-router` 防多副本。
3. **bridge 导航解耦**：现 router 写死 `/ai-chat`、bridge `onNavigateToAIChat` 拉起；卡带化后 feature 不直接碰壳路由，路径经 Options 注入、退出经 `onExit` 出口回调（对标 auth 的 `onAuthenticated` 出口模式）。

## 3. 目录结构

```text
template/h5-vue/
├── apps/
│   └── shell/                          # 壳装配层 + 壳内置页
│       ├── src/
│       │   ├── pages/                  # 壳骨架占位页(router 直接 import，不套工厂)
│       │   │   ├── Home.vue
│       │   │   ├── Detail.vue
│       │   │   └── ComingSoon.vue
│       │   ├── composables/useConfig.ts   # 跟随 config store 留 app 层
│       │   ├── router/index.ts         # 聚合内置页 + createAIChatRoute()，挂路由栈守卫
│       │   ├── stores/config.ts        # pinia config store
│       │   ├── App.vue
│       │   ├── env.d.ts
│       │   └── main.ts                 # createApp + loadConfig 启动 + configureHttp(baseURL)
│       ├── public/                     # config.json / token.json / img
│       ├── index.html
│       ├── vite.config.ts              # 唯一配 @vitejs/plugin-legacy
│       ├── tsconfig.app.json
│       └── package.json                # 依赖 @shell/* (workspace:*)
├── packages/
│   ├── core/        → @shell/core      # 纯逻辑，无 .vue / 无 pinia store
│   │   └── src/
│   │       ├── bridge/                 # ottservice.ts + index.ts
│   │       ├── focus/                  # FocusManager class + useFocusManager
│   │       ├── http/                   # request.ts + url.ts(baseURL 由 app 注入)
│   │       ├── config/                 # loadConfig() + getConfig() + 配置类型
│   │       ├── navigation/             # routerStack.ts + navigation.ts
│   │       ├── composables/            # useBackButton/useFocusRestore/useRouteCache/useVoiceInteraction
│   │       ├── utils/                  # image.ts + appUtils.ts
│   │       ├── types/                  # page.ts / config.ts / index.ts
│   │       └── index.ts
│   ├── ui/          → @shell/ui        # 全部 TV .vue 组件，依赖 core
│   │   └── src/
│   │       ├── components/             # Focusable*/TabBar/TabItem/PageHeader/ExitDialog/
│   │       │                           #   VoiceDialog/HintDialog/LoadingSpinner/BannerCarousel/
│   │       │                           #   Text/MultiColumnScrollView/FocusableTextScroll
│   │       ├── styles/                 # focusable.css + index.css
│   │       └── index.ts
│   └── features/
│       └── aichat/  → @shell/feature-aichat
│           └── src/
│               ├── pages/AIChatPage.vue       # 迁自 views/AIChat.vue，UI 不动
│               ├── adapters/routes.ts         # createAIChatRoute()
│               ├── model/types.ts             # AIChatFeatureOptions + 业务类型
│               ├── model/constants.ts         # aichatDefaults
│               └── index.ts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 4. 文件迁移映射

| 源（`template/h5-vue/src/`） | 目标 |
|---|---|
| `bridge/ottservice.ts`, `bridge/index.ts` | `packages/core/src/bridge/` |
| `composables/useFocusManager.ts`（含 FocusManager class） | `packages/core/src/focus/useFocusManager.ts` |
| `composables/useBackButton.ts` | `packages/core/src/composables/useBackButton.ts` |
| `composables/useFocusRestore.ts` | `packages/core/src/composables/useFocusRestore.ts` |
| `composables/useRouteCache.ts` | `packages/core/src/composables/useRouteCache.ts` |
| `composables/useVoiceInteraction.ts` | `packages/core/src/composables/useVoiceInteraction.ts` |
| `composables/useConfig.ts` | `apps/shell/src/composables/useConfig.ts`（跟随 store） |
| `stores/config.ts` | `apps/shell/src/stores/config.ts` |
| `api/request.ts`, `api/url.ts`, `api/index.ts` | `packages/core/src/http/` |
| `utils/config.ts`（loadConfig/getConfig） | `packages/core/src/config/` |
| `utils/routerStack.ts`, `utils/navigation.ts` | `packages/core/src/navigation/` |
| `utils/image.ts`, `utils/appUtils.ts`, `utils/index.ts` | `packages/core/src/utils/` |
| `types/page.ts`, `types/config.ts`, `types/index.ts` | `packages/core/src/types/` |
| `components/*.vue` | `packages/ui/src/components/` |
| `styles/*.css` | `packages/ui/src/styles/` |
| `views/Home.vue`, `views/Detail.vue`, `views/ComingSoon.vue` | `apps/shell/src/pages/` |
| `views/AIChat.vue` | `packages/features/aichat/src/pages/AIChatPage.vue` |
| `App.vue`, `main.ts`, `router/index.ts`, `env.d.ts` | `apps/shell/src/` |
| `index.html`, `vite.config.ts` | `apps/shell/` |
| `public/` | `apps/shell/public/` |

迁移时 `@/` 别名按目标包重写：core 内部相对引用、ui 引 `@shell/core`、app 引 `@shell/*`。

## 5. 对外契约（骨架接口签名）

### `packages/core/src/index.ts`

```ts
export * from './bridge'                          // ottService, OTT_NATIVE_KEYDOWN_EVENT, 调用类型
export { focusManager, useFocusManager } from './focus'
export type { FocusableElement } from './focus'
export { request, configureHttp, API_URL } from './http'   // configureHttp({ baseURL }) 由 app 调
export { loadConfig, getConfig } from './config'
export type { AppConfig } from './config'
export { routerStack, detectNavigationDirection } from './navigation'
export { useBackButton, useFocusRestore, useRouteCache, useVoiceInteraction } from './composables'
export * from './utils'
export type * from './types'
```

### `packages/ui/src/index.ts`

```ts
export { default as FocusableCard } from './components/FocusableCard.vue'
export { default as FocusableButton } from './components/FocusableButton.vue'
export { default as FocusableImage } from './components/FocusableImage.vue'
export { default as FocusableListItem } from './components/FocusableListItem.vue'
export { default as FocusableTextScroll } from './components/FocusableTextScroll.vue'
export { default as TabBar } from './components/TabBar.vue'
export { default as TabItem } from './components/TabItem.vue'
export { default as PageHeader } from './components/PageHeader.vue'
export { default as ExitDialog } from './components/ExitDialog.vue'
export { default as VoiceDialog } from './components/VoiceDialog.vue'
export { default as HintDialog } from './components/HintDialog.vue'
export { default as LoadingSpinner } from './components/LoadingSpinner.vue'
export { default as BannerCarousel } from './components/BannerCarousel.vue'
export { default as Text } from './components/Text.vue'
export { default as MultiColumnScrollView } from './components/MultiColumnScrollView.vue'
import './styles/index.css'
```

### `packages/features/aichat/src/`（五样契约，对标 auth）

```ts
// index.ts
export { createAIChatRoute } from './adapters/routes'   // 1. 路由工厂(主入口)
export { default as AIChatPage } from './pages/AIChatPage.vue'   // 2. Page 组件
export { aichatDefaults } from './model/constants'      // 3. 默认常量
export type { AIChatFeatureOptions } from './model/types'   // 4. 业务类型

// model/types.ts
import type { RouteMeta, RouteRecordRaw } from 'vue-router'
export interface AIChatFeatureOptions {
  path?: string            // 路由路径，默认 '/ai-chat'
  name?: string            // 路由 name，默认 'AIChat'
  meta?: RouteMeta
  onExit?: () => void      // 退出对话出口回调，feature 不反向依赖壳路由
}

// adapters/routes.ts
export function createAIChatRoute(options?: AIChatFeatureOptions): RouteRecordRaw
```

### app 装配示例 `apps/shell/src/router/index.ts`

```ts
import { createAIChatRoute } from '@shell/feature-aichat'
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: () => import('../pages/Home.vue') },
  { path: '/detail', name: 'Detail', component: () => import('../pages/Detail.vue') },
  { path: '/coming-soon', name: 'ComingSoon', component: () => import('../pages/ComingSoon.vue') },
  createAIChatRoute({ path: '/ai-chat' }),
]
```

## 6. 依赖方向（强约束）

```text
apps/shell       ─→  @shell/feature-*, @shell/ui, @shell/core
@shell/feature-* ─→  @shell/ui, @shell/core
@shell/ui        ─→  @shell/core
@shell/core      ─→  vue, vue-router, 第三方
```

- `@shell/feature-*` 之间互不依赖
- `@shell/ui` 不依赖 feature
- `@shell/core` 不含 `.vue`、不含 pinia store（config store 归 app 层）
- **对 ai-quant 的差异**：core **允许**依赖 `vue` / `vue-router`（TV 壳焦点框架/路由栈天然耦合路由类型），仍禁组件与 store
- 迁移中若发现 core composable 反向依赖 app store/config，改为参数 / Options 注入

## 7. catalog（锁低版本，沿用现 h5-vue，禁升级）

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
  - packages/features/*

catalog:
  vue: ^3.4.0
  vue-router: ^4.2.5
  pinia: ^2.1.7
  vite: ^5.0.0
  '@vitejs/plugin-vue': ^5.0.0
  '@vitejs/plugin-legacy': ^5.4.3   # Chromium53 兼容关键，只在 apps/shell 配
  terser: ^5.44.1
  typescript: ^5.3.0
  vue-tsc: ^2.0.8
  '@vue/tsconfig': ^0.5.0
  # eslint 链沿用现 devDependencies
```

依赖写法（强制）：第三方库子包写 `"catalog:"`，workspace 内部包写 `"workspace:*"`，禁子包硬编码版本号。

## 8. 根 scripts（`template/h5-vue/package.json`）

```jsonc
{
  "scripts": {
    "dev": "pnpm --dir apps/shell dev",
    "build:test": "pnpm --dir apps/shell build:test",
    "build:prod": "pnpm --dir apps/shell build:prod",
    "preview": "pnpm --dir apps/shell preview",
    "typecheck": "pnpm --dir apps/shell typecheck"
  }
}
```

## 9. 风险 / 待验证点

1. **legacy 产物兼容**：`@vitejs/plugin-legacy` 只在 `apps/shell/vite.config.ts` 配；core/ui 以源文件参与 app 构建（不预编译），由 app 的 legacy 链统一降级。验收：`pnpm build:prod` 产物仍含 nomodule 回退，能在 Chromium 53 跑。
2. **单实例**：catalog 锁单版本 `vue/pinia/vue-router`，防 `node_modules/.pnpm` 多副本导致 FocusManager / ottService 单例失效。验收：`dist/assets` 无重复 `vue.runtime` 副本。
3. **bridge 导航解耦**：`onNavigateToAIChat` 由 app 监听后 `router.push(path)`，feature 只经 `onExit` 出口回调。
4. **config 边界**：`loadConfig/getConfig` 纯函数下沉 core；pinia `config` store + `useConfig` 留 app 层；feature 经 Options 或 `getConfig()` 读配置，不依赖 app store。

## 10. 验收标准

- [ ] `pnpm install` 在 `template/h5-vue/` 成功，workspace 链接 4 个包
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build:prod` 成功，产物含 legacy nomodule 回退、无重复 vue 副本
- [ ] `pnpm dev` 启动，`/`、`/detail`、`/coming-soon`、`/ai-chat` 四条路由可达，焦点 / 返回键 / bridge 行为与迁移前一致
- [ ] 依赖方向无违例（feature 不互相依赖、ui 不依赖 feature、core 无 .vue / 无 store）

## 11. 不做

- 不重写任何组件 / 业务 UI / 焦点算法逻辑（纯平移 + 改引用路径）
- 不升级任何依赖版本
- 不预建 `feature-vod` / `feature-live` 等空占位（真有第二盘卡带时再按 aichat 样板复制）
- 不引入 `eslint-plugin-boundaries` / `dependency-cruiser`（依赖方向当前靠人守，与 ai-quant 现状一致）
