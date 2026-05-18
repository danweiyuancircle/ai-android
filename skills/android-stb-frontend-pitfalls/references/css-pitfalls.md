# CSS 避坑详谈

按"陷阱 → 症状 → 方案"组织。所有版本号引自 [[compat-matrix]]。

## 1. Tailwind 版本红线（最大坑）

| Tailwind 版本 | 浏览器下限 | 机顶盒可用性 | 备注 |
|---|---|---|---|
| **v4.0+** | **Chrome 111 / Safari 16.4 / Firefox 128** | ❌ Chrome 53/66/80 全炸 | 用 `@layer` / `color-mix()` / `@property` / Cascade Layers，硬依赖 |
| **v3.4** | Chrome 88+ | ❌ 53/66 都不行 | 内部用 `:is()` 简化复杂选择器 |
| **v3.3** | Chrome 88+ | ❌ | 同上 |
| **v3.0 ~ v3.2** | Chrome 64+ | ⚠️ chrome53 边缘，chrome66 可用 | 最后一个对老 WebView 友好的档 |
| **v2.x** | IE11/Safari 9+ | ✓ | 已停止维护，不推荐 |

**症状**：升级 Tailwind v4 后机顶盒整屏白屏或样式错乱；F12 控制台报 `@layer` 不识别。

**方案**：
- Chrome 53 / 66 项目：用 **UnoCSS preset-mini** + `@unocss/preset-attributify`，或纯手写 CSS。UnoCSS preset-mini 特性可裁剪，能完全避开 `:is`。
- 如必须用 Tailwind：锁 `tailwindcss@3.2.7` + `postcss@8.4.x` + `autoprefixer@10.4.x`
- 两端共用设计系统的情况：把 Tailwind v4 用在后台管理（桌面浏览器），TV 端单独用 UnoCSS 或手写。fast-platform 即此模式

## 2. autoprefixer 与 browserslist 必须对齐

**症状**：`transform`、`flex` 等属性的 `-webkit-` 前缀丢失，老 WebView 渲染异常。

**根因**：Vite legacy 的 `targets`、`@vitejs/plugin-legacy` 的 `targets`、PostCSS 的 `browserslist` 是**三套独立**配置，常见漏配。

**方案**：在 `package.json` 写一份 `browserslist`，所有工具读同一份：

```json
{
  "browserslist": [
    "chrome >= 53",
    "android >= 5.1"
  ]
}
```

然后：

- `vite.config.ts` 里 `@vitejs/plugin-legacy({ targets: 'chrome >= 53' })`（这个选项不会读 package.json browserslist，必须显式写）
- PostCSS / autoprefixer 会自动读 package.json 的 `browserslist`
- ESLint 的 `eslint-plugin-compat` 也会读这份配置，可用它静态检查不兼容 API

## 3. Flex `gap`（Chrome 84+）

**症状**：Chrome 53/66/70/80 都不识别，元素挤在一起。

**方案**：

```css
/* 不要这样写 */
.list { display: flex; gap: 16px; }

/* 改成 */
.list { display: flex; }
.list > * + * { margin-left: 16px; }
/* 或者 */
.list > * { margin-right: 16px; }
.list > *:last-child { margin-right: 0; }
```

Grid 的 `gap` 在 Chrome 66+ 可用（Grid 自身也是 Chrome 57+），相对友好。

## 4. `aspect-ratio`（Chrome 88+）

**症状**：图片或卡片高度塌陷。

**方案**：

```css
/* 16:9 卡片 */
.card-16-9 {
  position: relative;
  padding-top: 56.25%; /* 9/16 = 56.25% */
}
.card-16-9 > * {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}
```

## 5. `:is()` / `:where()` / `:has()` / `:not(complex)`（Chrome 88+ / 105+）

**症状**：选择器整条失效（CSS 选择器列表语义：一个无效就整条 invalid）。

**方案**：

```css
/* 不要这样写（Chrome 88- 失效） */
.menu :is(a, button) { color: red; }

/* 改成 */
.menu a, .menu button { color: red; }

/* 不要这样写（Chrome 105- 失效） */
.card:has(img) { padding: 8px; }

/* 改成：JS 检测，加 class */
document.querySelectorAll('.card').forEach(c => {
  if (c.querySelector('img')) c.classList.add('has-img');
});
/* CSS: */
.card.has-img { padding: 8px; }
```

## 6. Container Queries（Chrome 105+）

**症状**：`@container` 整块 CSS 失效。

**方案**：放弃 container queries，回退到 media query + JS 测父元素尺寸打 class。

```js
// 用 ResizeObserver（Chrome 64+，老盒子 polyfill）
const ro = new ResizeObserver(entries => {
  entries.forEach(e => {
    const w = e.contentRect.width;
    e.target.classList.toggle('narrow', w < 480);
    e.target.classList.toggle('wide', w >= 480);
  });
});
ro.observe(card);
```

## 7. `dvh` / `svh` / `lvh`（Chrome 108+）

**症状**：使用 `100dvh` 时全屏高度为 0 或 `auto`。

**方案**：用 `100vh` + JS 修正。机顶盒一般无浏览器地址栏问题，直接 `100vh` 即可。

```css
.fullscreen { height: 100vh; }
```

或写 CSS 变量动态注入：

```js
function setVh() {
  document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
}
setVh();
window.addEventListener('resize', setVh);
```

```css
.fullscreen { height: var(--vh, 100vh); }
```

## 8. `color-mix()` / `@property` / `accent-color`（111 / 85 / 93）

机顶盒一律不用。颜色混合用 Sass 预编译，custom property animation 改用 `transition`。

## 9. 滚动条样式

**症状**：`::-webkit-scrollbar` 自定义样式在某些 OTT 基座 WebView 被强制覆盖（基座 hardcoded 全局滚动条主题）。

**方案**：

- 优先做 TV 体验：默认 `overflow: hidden`，列表用 JS 实现"焦点驱动平滑滚动"，**根本不显示原生滚动条**
- 如必须显示：在 `<html>` 上加伪类隔离，并 `!important` 一遍
- 用 ResizeObserver / IntersectionObserver 自绘 thumb

## 10. TV 1080p 设计稿单位

**症状**：用 `rem` 时，OTT 基座可能强制 `<html>` font-size 或 zoom，导致整体缩放错乱。

**方案**：

- TV 端 viewport 固定 1920×1080，使用 `px`，不用 `rem`：

```html
<meta name="viewport" content="width=1920, initial-scale=1, user-scalable=no">
```

- 设计稿就按 1920×1080 切，所有 px 直接抄
- 若要兼容 4K（3840×2160），用 `transform: scale(2)` 整体放大根容器；不要去算 rem

## 11. `will-change` 与 GPU 内存

**症状**：列表里每张卡都加 `will-change: transform`，老盒子 5 秒后整页崩、白屏，logcat 报 GL OOM。

**根因**：老盒子 GPU 内存 < 256MB，每个 `will-change` 都创建独立合成层。

**方案**：

- `will-change` 只在**正在动画**的元素上短暂启用，动画结束立刻移除：

```js
el.style.willChange = 'transform';
el.addEventListener('transitionend', () => { el.style.willChange = 'auto'; }, { once: true });
```

- 焦点放大效果用 CSS `transform: scale()`，不要用改 `width`/`height`
- 同屏动画元素数量控在 10 以内
- 大图缩略图加 `image-rendering: auto`（默认）或 `pixelated`，不要随便用 `crisp-edges`

## 12. 字体回退

**症状**：盒子上没装中文字体，渲染豆腐块。

**方案**：

```css
body {
  font-family:
    -apple-system, BlinkMacSystemFont,
    'PingFang SC', 'Hiragino Sans GB',
    'Source Han Sans CN', 'Noto Sans CJK SC',
    'Microsoft YaHei', 'WenQuanYi Micro Hei',
    sans-serif;
}
```

机顶盒一般有 Droid Sans Fallback，能渲染基础汉字。需要思源 / 苹方等具体字体的，要么走自托管 woff2（注意 woff2 解码 Chrome 36+ 全 OK），要么放弃。

## 13. `position: sticky`（Chrome 56+）

机顶盒 53 不支持，66 起 OK。Chrome 53 项目用 `position: fixed` 替代。

## 14. CSS 变量在 IE 风格降级时

Vite legacy 编译 JS 时会降级语法，但 **CSS 变量不会被降级**（PostCSS 没插件做到完美降级）。Chrome 53 原生支持 CSS 变量（since 49），所以这点机顶盒场景不踩。

## 15. 真机自查清单

每次发版前，在目标盒子上跑一遍：

- [ ] 焦点框正常显示（不被 OTT 基座覆盖）
- [ ] 列表加载 100+ 项后滚动不卡
- [ ] 缩放动画 60fps（开 FPS 监视器）
- [ ] 长时间使用 30 分钟后无白屏 / 闪退
- [ ] 横屏 1920×1080 / 4K 3840×2160 两套分辨率都过
- [ ] 切后台再切回，样式 / 焦点不丢

## 案例引用

- `/Users/chances/sh_tour_ai/src/styles/focusable.css:4-34` — 焦点样式用 CSS 变量，Chrome 53 OK
- `/Users/chances/sh_tour_ai/src/styles/index.css:31-57` — 自定义滚动条 + `image-rendering: crisp-edges`
- `/Users/chances/sh_tour_ai/vite.config.ts:39-42` — `@vitejs/plugin-legacy({ targets: 'chrome >= 53' })`
