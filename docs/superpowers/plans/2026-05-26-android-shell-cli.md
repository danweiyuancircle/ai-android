# Android 套壳脚手架 CLI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **提交策略**：本仓库约定「仅用户要求时提交」。各 Task 的 commit 步骤为计划完整性所列；实际执行时若用户未授权提交，先攒改动、按用户指示统一提交（master 分支需先开分支）。

**Goal:** 清理 android-shell 模板包名/图标基线，并新增可扩展的 Node.js 脚手架 CLI，按技术栈一键生成「Android 套壳 + H5」工程并定制 applicationId / 应用名 / 图标。

**Architecture:** 两部分。A) 一次性手工把 `template/` 全模块包名 `com.example.shell` → `com.chances.shell`、换唯一名启动图标。B) `cli/` 下 Node.js（仅内置模块）实现：技术栈注册表 + 纯函数变换（校验/文本编辑/图标 key）+ 文件级变换（拷贝排除、app 模块包重写）+ 编排器 generate + CLI 入口。app 包重写靠「app 自有包精确集合」避免误伤库包。

**Tech Stack:** Node.js ≥18（`node:util` parseArgs、`node:readline/promises`、`node:fs` cpSync、`node --test` + `node:assert`），无第三方依赖。

---

## 文件结构

部分 A（改 `template/`）：
- 全模块源码目录 `.../com/example/shell` → `.../com/chances/shell`
- 全部 `.kt`/`.xml`/`.gradle`/`.pro` 中 `com.example.shell` → `com.chances.shell`
- 2 个 SPI 文件改名 + 内容改
- `app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png`（新建占位图）
- `app/src/main/AndroidManifest.xml`（图标属性）
- `template/README.md`（文档同步）

部分 B（新建 `cli/`）：
- `cli/package.json` — bin / test 脚本 / engines
- `cli/stacks.js` — 技术栈注册表
- `cli/lib/validate.js` — 输入校验（纯函数 + 图标文件检查）
- `cli/lib/iconKey.js` — applicationId → 图标资源 key（纯函数）
- `cli/lib/textEdits.js` — gradle/manifest/strings 文本变换（纯函数）
- `cli/lib/copyTree.js` — 带排除的递归拷贝
- `cli/lib/renameAppPackage.js` — app 模块包重写（文件级）
- `cli/lib/generate.js` — 编排器
- `cli/index.js` — CLI 入口（参数解析 + 交互补齐）
- `cli/test/*.test.js` — 各模块单测 + e2e
- `cli/README.md` — 用法

---

## 部分 A：模板基线清理

### Task 1: 全模块包名 com.example.shell → com.chances.shell

**Files:**
- Modify（内容）: 所有含 `com.example.shell` 的 `.kt`/`.xml`/`.gradle`/`.pro`（见下方 grep）
- Move（目录）: 每个模块 `src/main/java/com/example` → `com/chances`
- Rename（SPI 文件）:
  - `feature_voice/shijiu/src/main/resources/META-INF/services/com.example.shell.voice.VoiceControllerProvider`
  - `feature_voice/internet/src/main/resources/META-INF/services/com.example.shell.voice.VoiceControllerProvider`

- [ ] **Step 1: 确认改动面（基线 grep）**

Run:
```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
grep -rln "com.example.shell" . | grep -v '/build/'
```
Expected: 列出 app / lib_base / feature_voice 三层下的 kt、xml、gradle、pro 文件（约 30 个）。记下数量。

- [ ] **Step 2: 移动源码目录（5 个模块）**

每个模块把 `com/example` 整体改名为 `com/chances`（`example` 下仅 `shell`）：
```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
for m in app lib_base feature_voice/core feature_voice/internet feature_voice/shijiu; do
  git mv "$m/src/main/java/com/example" "$m/src/main/java/com/chances"
done
```
Expected: 5 次移动成功，无报错。

- [ ] **Step 3: 重命名 2 个 SPI service 文件**

```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
for m in shijiu internet; do
  d="feature_voice/$m/src/main/resources/META-INF/services"
  git mv "$d/com.example.shell.voice.VoiceControllerProvider" \
         "$d/com.chances.shell.voice.VoiceControllerProvider"
done
```
Expected: 2 次移动成功。

- [ ] **Step 4: 全量替换文件内容 com.example.shell → com.chances.shell**

```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
grep -rln "com.example.shell" . | grep -v '/build/' | while read -r f; do
  perl -pi -e 's/com\.example\.shell/com.chances.shell/g' "$f"
done
```
Expected: 无报错。（含 kt 的 package/import、5 个 manifest 的 `package=`、`app/build.gradle` 的 `applicationId`、3 个 `consumer-rules.pro`、2 个 SPI 文件内容。）

- [ ] **Step 5: 验证零残留 + 结构完整**

Run:
```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
echo "残留:"; grep -rln "com.example.shell" . | grep -v '/build/' | wc -l
echo "新包目录:"; find . -type d -path '*com/chances/shell' -not -path '*/build/*' | wc -l
echo "manifest:"; grep -rh 'package=' */src/main/AndroidManifest.xml feature_voice/*/src/main/AndroidManifest.xml
echo "applicationId:"; grep applicationId app/build.gradle
```
Expected: 残留 `0`；新包目录 `5`；5 个 manifest 全部 `com.chances.shell*`；applicationId 为 `'com.chances.shell'`。

- [ ] **Step 6: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add -A template/android-shell
git commit -m "refactor(template): android-shell 包名 com.example.shell → com.chances.shell"
```

---

### Task 2: 唯一名启动图标替换系统默认图标

**Files:**
- Create: `template/android-shell/app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png`
- Modify: `template/android-shell/app/src/main/AndroidManifest.xml:27`（`android:icon`）
- Modify: `template/README.md`（起项目改动点补图标说明）

- [ ] **Step 1: 生成占位 PNG（144×144 纯色，零依赖）**

用 Node 内置 zlib 生成合法 PNG，写入 mipmap-xxhdpi：
```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
mkdir -p app/src/main/res/mipmap-xxhdpi
node -e '
const zlib=require("zlib"),fs=require("fs");
const W=144,H=144,R=0x42,G=0x6e,B=0xff; // 纯蓝色占位
const raw=Buffer.alloc((W*3+1)*H);
for(let y=0;y<H;y++){let o=y*(W*3+1);raw[o]=0;for(let x=0;x<W;x++){let p=o+1+x*3;raw[p]=R;raw[p+1]=G;raw[p+2]=B;}}
const idat=zlib.deflateSync(raw);
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data]))>>>0);return Buffer.concat([len,t,data,crc]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
fs.writeFileSync("app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png",png);
console.log("wrote",png.length,"bytes");
'
file app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png
```
Expected: 输出 `wrote NNNN bytes`，`file` 报告 `PNG image data, 144 x 144`。

- [ ] **Step 2: 改 manifest 图标属性**

把 `template/android-shell/app/src/main/AndroidManifest.xml` 中：
```xml
        android:icon="@android:drawable/sym_def_app_icon"
```
改为：
```xml
        android:icon="@mipmap/ic_launcher_shell"
```

- [ ] **Step 3: README 补图标说明**

在 `template/README.md` 「起项目改动点（搜 `TODO`）」一行（含 `applicationId`、`H5_URL`…那行）末尾追加：
```
、应用图标（`app/src/main/res/mipmap-xxhdpi/ic_launcher_<key>.png`，用唯一名防被盒子应用同步按 `ic_launcher` 通用名覆盖）
```

- [ ] **Step 4: 验证**

Run:
```bash
cd /Users/chances/StudioProjects/ai-android/template/android-shell
grep -n 'android:icon' app/src/main/AndroidManifest.xml
ls -l app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png
grep -c 'sym_def_app_icon' app/src/main/AndroidManifest.xml
```
Expected: icon 行为 `@mipmap/ic_launcher_shell`；PNG 存在；`sym_def_app_icon` 计数 `0`。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add -A template/android-shell/app/src/main/res template/android-shell/app/src/main/AndroidManifest.xml template/README.md
git commit -m "feat(template): android-shell 用唯一名启动图标 ic_launcher_shell 替换系统默认图标"
```

---

## 部分 B：脚手架 CLI

### Task 3: CLI 骨架（package.json + stacks 注册表）

**Files:**
- Create: `cli/package.json`
- Create: `cli/stacks.js`
- Create: `cli/test/stacks.test.js`

- [ ] **Step 1: 写 package.json**

`cli/package.json`：
```json
{
  "name": "create-android-shell",
  "version": "0.1.0",
  "description": "脚手架：生成 Android WebView 套壳 + H5 模板工程",
  "bin": { "create-android-shell": "index.js" },
  "type": "commonjs",
  "scripts": { "test": "node --test" },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 2: 写技术栈注册表**

`cli/stacks.js`：
```js
/**
 * 技术栈注册表（可扩展点）。
 *
 * 每个技术栈声明壳模板目录、H5 模板目录，以及配套 rules/skill（仅打印提示用，CLI 不自动拷）。
 * 新增 react = 加一条注册 + 补 template/h5-react/，主流程零改动。
 */
module.exports = {
  'android-support-vue': {
    shell: 'android-shell',
    h5: 'h5-vue',
    rules: ['android-dev-spec.md', 'android-support-library-only.md', 'android-webview-5.md'],
    skill: ['chances-sdk'],
  },
};
```

- [ ] **Step 3: 写测试**

`cli/test/stacks.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const stacks = require('../stacks');

test('默认技术栈 android-support-vue 存在且字段完整', () => {
  const s = stacks['android-support-vue'];
  assert.ok(s, '应注册 android-support-vue');
  assert.strictEqual(s.shell, 'android-shell');
  assert.strictEqual(s.h5, 'h5-vue');
  assert.ok(Array.isArray(s.rules) && s.rules.length > 0);
});
```

- [ ] **Step 4: 跑测试**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test`
Expected: PASS（1 test）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/package.json cli/stacks.js cli/test/stacks.test.js
git commit -m "feat(cli): 脚手架骨架 + 技术栈注册表"
```

---

### Task 4: 输入校验 validate.js

**Files:**
- Create: `cli/lib/validate.js`
- Create: `cli/test/validate.test.js`

- [ ] **Step 1: 写失败测试**

`cli/test/validate.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateAppId, validateStack, validateParent, validateIcon } = require('../lib/validate');

test('validateAppId 接受合法包名、拒绝非法', () => {
  assert.strictEqual(validateAppId('com.chances.tour'), null);
  assert.strictEqual(validateAppId('com.foo.bar_baz'), null);
  assert.ok(validateAppId('com'));            // 至少两段
  assert.ok(validateAppId('Com.Foo'));        // 不允许大写开头
  assert.ok(validateAppId('com..foo'));       // 空段
  assert.ok(validateAppId('1com.foo'));       // 数字开头
});

test('validateStack 校验注册表成员', () => {
  const reg = { 'android-support-vue': {} };
  assert.strictEqual(validateStack('android-support-vue', reg), null);
  assert.ok(validateStack('android-support-react', reg));
});

test('validateParent 拒绝已存在非空目录', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p-'));
  fs.writeFileSync(path.join(dir, 'x'), '1');
  assert.ok(validateParent(dir));                       // 非空 → 报错
  assert.strictEqual(validateParent(path.join(dir, 'new')), null); // 不存在 → ok
});

test('validateIcon 要求存在的 PNG 文件', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i-'));
  const png = path.join(dir, 'a.png');
  fs.writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
  const notPng = path.join(dir, 'b.png');
  fs.writeFileSync(notPng, Buffer.from([0, 1, 2, 3]));
  assert.strictEqual(validateIcon(png), null);
  assert.ok(validateIcon(notPng));                      // magic 不符
  assert.ok(validateIcon(path.join(dir, 'nope.png')));  // 不存在
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/validate.test.js`
Expected: FAIL（`Cannot find module '../lib/validate'`）。

- [ ] **Step 3: 实现 validate.js**

`cli/lib/validate.js`：
```js
const fs = require('node:fs');

const APP_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/** 校验 applicationId。合法返回 null，否则返回错误消息。 */
function validateAppId(id) {
  return APP_ID_RE.test(id) ? null : `applicationId 非法（需形如 com.foo.bar，全小写）：${id}`;
}

/** 校验技术栈在注册表中。合法返回 null，否则返回错误消息（含可选值）。 */
function validateStack(name, registry) {
  if (registry[name]) {
    return null;
  }
  return `未知技术栈 ${name}，可选：${Object.keys(registry).join(', ')}`;
}

/** 校验父目录可用（不存在或为空）。可用返回 null，否则返回错误消息。 */
function validateParent(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }
  if (fs.readdirSync(dir).length === 0) {
    return null;
  }
  return `目标目录已存在且非空：${dir}`;
}

/** 校验图标为存在的 PNG 文件（按 magic number）。合法返回 null，否则返回错误消息。 */
function validateIcon(p) {
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
    return `图标文件不存在：${p}`;
  }
  const head = Buffer.alloc(4);
  const fd = fs.openSync(p, 'r');
  try {
    fs.readSync(fd, head, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  return head.equals(PNG_MAGIC) ? null : `图标必须是 PNG：${p}`;
}

module.exports = { validateAppId, validateStack, validateParent, validateIcon };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/validate.test.js`
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/validate.js cli/test/validate.test.js
git commit -m "feat(cli): 输入校验 validate（appId/stack/parent/icon）"
```

---

### Task 5: 图标资源 key iconKey.js

**Files:**
- Create: `cli/lib/iconKey.js`
- Create: `cli/test/iconKey.test.js`

- [ ] **Step 1: 写失败测试**

`cli/test/iconKey.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { iconKeyFromAppId } = require('../lib/iconKey');

test('取 applicationId 末段并 sanitize 成 [a-z0-9_]', () => {
  assert.strictEqual(iconKeyFromAppId('com.chances.tour'), 'tour');
  assert.strictEqual(iconKeyFromAppId('com.foo.Bar-X'), 'bar_x');
  assert.strictEqual(iconKeyFromAppId('com.a.b2c'), 'b2c');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/iconKey.test.js`
Expected: FAIL（模块缺失）。

- [ ] **Step 3: 实现 iconKey.js**

`cli/lib/iconKey.js`：
```js
/**
 * 由 applicationId 推导图标资源 key（取末段，非 [a-z0-9_] 字符转 _）。
 *
 * 用于命名 ic_launcher_<key>.png，保证按 applicationId 唯一，防被盒子应用同步按通用名覆盖。
 *
 * @param appId applicationId，如 com.chances.tour
 * @return 资源 key，如 tour
 */
function iconKeyFromAppId(appId) {
  const last = appId.slice(appId.lastIndexOf('.') + 1);
  return last.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

module.exports = { iconKeyFromAppId };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/iconKey.test.js`
Expected: PASS（1 test）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/iconKey.js cli/test/iconKey.test.js
git commit -m "feat(cli): 图标资源 key 推导 iconKey"
```

---

### Task 6: 文本变换 textEdits.js

**Files:**
- Create: `cli/lib/textEdits.js`
- Create: `cli/test/textEdits.test.js`

- [ ] **Step 1: 写失败测试**

`cli/test/textEdits.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { setApplicationId, setManifestPackage, setAppName, setLauncherIcon } = require('../lib/textEdits');

test('setApplicationId 替换单/双引号 applicationId', () => {
  assert.match(setApplicationId("        applicationId 'com.chances.shell'", 'com.foo.bar'),
    /applicationId 'com\.foo\.bar'/);
  assert.match(setApplicationId('    applicationId "com.chances.shell"', 'com.foo.bar'),
    /applicationId 'com\.foo\.bar'/);
});

test('setManifestPackage 替换 manifest 根 package', () => {
  const xml = '<manifest xmlns:android="x"\n    package="com.chances.shell">';
  assert.match(setManifestPackage(xml, 'com.foo.bar'), /package="com\.foo\.bar"/);
});

test('setAppName 替换 app_name', () => {
  const xml = '<string name="app_name">Shell Template</string>';
  assert.strictEqual(setAppName(xml, '旅游助手'), '<string name="app_name">旅游助手</string>');
});

test('setLauncherIcon 替换 android:icon', () => {
  const xml = '        android:icon="@android:drawable/sym_def_app_icon"';
  assert.match(setLauncherIcon(xml, 'ic_launcher_tour'), /android:icon="@mipmap\/ic_launcher_tour"/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/textEdits.test.js`
Expected: FAIL（模块缺失）。

- [ ] **Step 3: 实现 textEdits.js**

`cli/lib/textEdits.js`：
```js
/**
 * gradle / manifest / strings 的纯文本变换。每个函数 string -> string，不碰文件系统。
 */

/** 替换 app/build.gradle 的 applicationId（兼容单双引号），统一输出单引号。 */
function setApplicationId(text, appId) {
  return text.replace(/applicationId\s+['"][^'"]*['"]/, `applicationId '${appId}'`);
}

/** 替换 AndroidManifest 根标签的 package 属性（首个 package=）。 */
function setManifestPackage(text, pkg) {
  return text.replace(/package="[^"]*"/, `package="${pkg}"`);
}

/** 替换 strings.xml 的 app_name 文案。 */
function setAppName(text, name) {
  return text.replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${name}$2`);
}

/** 替换 application 的 android:icon 为 @mipmap/<resName>。 */
function setLauncherIcon(text, resName) {
  return text.replace(/android:icon="[^"]*"/, `android:icon="@mipmap/${resName}"`);
}

module.exports = { setApplicationId, setManifestPackage, setAppName, setLauncherIcon };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/textEdits.test.js`
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/textEdits.js cli/test/textEdits.test.js
git commit -m "feat(cli): gradle/manifest/strings 文本变换 textEdits"
```

---

### Task 7: 带排除递归拷贝 copyTree.js

**Files:**
- Create: `cli/lib/copyTree.js`
- Create: `cli/test/copyTree.test.js`

- [ ] **Step 1: 写失败测试**

`cli/test/copyTree.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { copyTree, DEFAULT_EXCLUDES } = require('../lib/copyTree');

test('拷贝时排除构建产物目录/文件', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'src-'));
  fs.mkdirSync(path.join(src, 'app/build'), { recursive: true });
  fs.writeFileSync(path.join(src, 'app/build/x.class'), '1');
  fs.writeFileSync(path.join(src, 'app/Main.kt'), 'k');
  fs.mkdirSync(path.join(src, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(src, 'node_modules/dep.js'), 'd');
  fs.writeFileSync(path.join(src, 'app.iml'), 'i');
  fs.writeFileSync(path.join(src, 'local.properties'), 'p');

  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'dst-'));
  copyTree(src, dest, DEFAULT_EXCLUDES);

  assert.ok(fs.existsSync(path.join(dest, 'app/Main.kt')), '业务源码应拷');
  assert.ok(!fs.existsSync(path.join(dest, 'app/build')), 'build/ 应排除');
  assert.ok(!fs.existsSync(path.join(dest, 'node_modules')), 'node_modules 应排除');
  assert.ok(!fs.existsSync(path.join(dest, 'app.iml')), '*.iml 应排除');
  assert.ok(!fs.existsSync(path.join(dest, 'local.properties')), 'local.properties 应排除');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/copyTree.test.js`
Expected: FAIL（模块缺失）。

- [ ] **Step 3: 实现 copyTree.js**

`cli/lib/copyTree.js`：
```js
const fs = require('node:fs');
const path = require('node:path');

/** 拷贝时排除的目录名 / 文件名 / 通配（构建产物、本地配置）。 */
const DEFAULT_EXCLUDES = {
  names: ['build', '.gradle', '.idea', 'node_modules', 'dist'],
  files: ['local.properties'],
  patterns: [/\.iml$/],
};

/**
 * 递归拷贝目录，按 excludes 跳过构建产物。
 *
 * @param src 源目录
 * @param dest 目标目录
 * @param excludes 形如 DEFAULT_EXCLUDES
 */
function copyTree(src, dest, excludes) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const base = path.basename(s);
      if (excludes.names.includes(base)) {
        return false;
      }
      if (excludes.files.includes(base)) {
        return false;
      }
      return !excludes.patterns.some((re) => re.test(base));
    },
  });
}

module.exports = { copyTree, DEFAULT_EXCLUDES };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/copyTree.test.js`
Expected: PASS（1 test）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/copyTree.js cli/test/copyTree.test.js
git commit -m "feat(cli): 带排除的递归拷贝 copyTree"
```

---

### Task 8: app 模块包重写 renameAppPackage.js

**Files:**
- Create: `cli/lib/renameAppPackage.js`
- Create: `cli/test/renameAppPackage.test.js`

- [ ] **Step 1: 写失败测试（关键：保留库包、改写自有包）**

`cli/test/renameAppPackage.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renameAppPackage } = require('../lib/renameAppPackage');

function write(p, c) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c);
}

test('只改写 app 自有包，保留 .base/.voice 库包', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'java-'));
  const base = path.join(root, 'com/chances/shell');
  // app 根类
  write(path.join(base, 'OttApplication.kt'),
    'package com.chances.shell\n\nimport com.chances.shell.web.WebActivity\n');
  // app 子包类，混合 import 自有包 + 库包
  write(path.join(base, 'web/WebActivity.kt'),
    [
      'package com.chances.shell.web',
      '',
      'import com.chances.shell.bridge.OttServiceBridge',      // 自有 → 改
      'import com.chances.shell.base.bridge.ShellHost',        // 库 → 不改
      'import com.chances.shell.voice.VoiceControllerFactory', // 库 → 不改
      'import com.chances.shell.BuildConfig',                  // 自有 → 改
      'import com.chances.shell.web.*',                        // 自有通配 → 改
    ].join('\n') + '\n');
  write(path.join(base, 'bridge/OttServiceBridge.kt'), 'package com.chances.shell.bridge\n');

  renameAppPackage(root, 'com.chances.shell', 'com.foo.bar');

  // 目录已移动
  assert.ok(fs.existsSync(path.join(root, 'com/foo/bar/web/WebActivity.kt')), 'app 目录应移到新包路径');
  assert.ok(!fs.existsSync(path.join(root, 'com/chances/shell')), '旧 app 目录应清空');

  const web = fs.readFileSync(path.join(root, 'com/foo/bar/web/WebActivity.kt'), 'utf8');
  assert.match(web, /^package com\.foo\.bar\.web$/m);
  assert.match(web, /import com\.foo\.bar\.bridge\.OttServiceBridge/);
  assert.match(web, /import com\.foo\.bar\.BuildConfig/);
  assert.match(web, /import com\.foo\.bar\.web\.\*/);
  // 库包必须原样保留
  assert.match(web, /import com\.chances\.shell\.base\.bridge\.ShellHost/);
  assert.match(web, /import com\.chances\.shell\.voice\.VoiceControllerFactory/);

  const app = fs.readFileSync(path.join(root, 'com/foo/bar/OttApplication.kt'), 'utf8');
  assert.match(app, /^package com\.foo\.bar$/m);
  assert.match(app, /import com\.foo\.bar\.web\.WebActivity/);
});
```

> 注：上面行尾 `// 自有 → 改` 等是 Kotlin 行内注释，import 语句合法；测试只校验包名前缀改写，不受注释影响。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/renameAppPackage.test.js`
Expected: FAIL（模块缺失）。

- [ ] **Step 3: 实现 renameAppPackage.js**

`cli/lib/renameAppPackage.js`：
```js
const fs = require('node:fs');
const path = require('node:path');

/**
 * 把 app 模块源码包从 oldPkg 重写到 newPkg，只动 app 自有包，不动其依赖的库包。
 *
 * 算法：先扫描 app 源码目录收集「app 自有包精确集合」（全部以 oldPkg 为前缀的已声明包），
 * 再逐文件重写 package 声明与「包部分精确命中自有集合」的 import，最后把目录从 oldPkg 路径移到 newPkg 路径。
 * 库包（com.chances.shell.base / .voice）不在 app 模块目录内，不入自有集合，故 import 它们时原样保留。
 *
 * 约束：不处理 app 自有类的「嵌套类/成员」式 import（本模板无此用法）。
 *
 * @param appJavaRoot app 模块 java 源码根（其下为 com/...）
 * @param oldPkg 旧 app 包名，如 com.chances.shell
 * @param newPkg 新 app 包名（= applicationId）
 */
function renameAppPackage(appJavaRoot, oldPkg, newPkg) {
  const files = listKtFiles(appJavaRoot);
  const owned = new Set();
  for (const f of files) {
    const m = fs.readFileSync(f, 'utf8').match(/^\s*package\s+([\w.]+)/m);
    if (m) {
      owned.add(m[1]);
    }
  }
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, rewrite(src, owned, oldPkg, newPkg));
  }
  moveDir(appJavaRoot, oldPkg, newPkg);
}

/** 递归列出目录下所有 .kt 文件绝对路径。 */
function listKtFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listKtFiles(full));
    } else if (e.name.endsWith('.kt')) {
      out.push(full);
    }
  }
  return out;
}

/** 逐行重写 package 声明与命中自有集合的 import。 */
function rewrite(src, owned, oldPkg, newPkg) {
  return src.split('\n').map((line) => {
    const pkg = line.match(/^(\s*package\s+)([\w.]+)(.*)$/);
    if (pkg && owned.has(pkg[2])) {
      return pkg[1] + swap(pkg[2], oldPkg, newPkg) + pkg[3];
    }
    const imp = line.match(/^(\s*import\s+)([\w.]+(?:\.\*)?)(.*)$/);
    if (imp) {
      const fqn = imp[2];
      // 自有判定：通配 import 的「包」就是 .* 之前的整体；普通 import 的「包」是去掉末段（类名）。
      const candidate = fqn.endsWith('.*')
        ? fqn.slice(0, -2)
        : (fqn.includes('.') ? fqn.slice(0, fqn.lastIndexOf('.')) : fqn);
      if (owned.has(candidate)) {
        return imp[1] + swap(fqn, oldPkg, newPkg) + imp[3];
      }
    }
    return line;
  }).join('\n');
}

/** 把以 oldPkg 开头的全限定名换成 newPkg 开头。 */
function swap(s, oldPkg, newPkg) {
  return newPkg + s.slice(oldPkg.length);
}

/** 把 app 源码目录从 oldPkg 路径移到 newPkg 路径，并清理空残留目录。 */
function moveDir(root, oldPkg, newPkg) {
  const oldPath = path.join(root, ...oldPkg.split('.'));
  const newPath = path.join(root, ...newPkg.split('.'));
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);
  pruneEmptyUp(path.dirname(oldPath), root);
}

/** 从 dir 向上删空目录，直到非空或到达 root（不删 root）。 */
function pruneEmptyUp(dir, root) {
  let cur = dir;
  while (cur.startsWith(root) && cur !== root) {
    if (!fs.existsSync(cur) || fs.readdirSync(cur).length > 0) {
      break;
    }
    fs.rmdirSync(cur);
    cur = path.dirname(cur);
  }
}

module.exports = { renameAppPackage };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/renameAppPackage.test.js`
Expected: PASS（1 test）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/renameAppPackage.js cli/test/renameAppPackage.test.js
git commit -m "feat(cli): app 模块包重写 renameAppPackage（保留库包）"
```

---

### Task 9: 编排器 generate.js（e2e 对真实模板）

**Files:**
- Create: `cli/lib/generate.js`
- Create: `cli/test/generate.test.js`

- [ ] **Step 1: 写 e2e 失败测试（生成到临时目录并断言产物，纯 Node 扫描不用 shell）**

`cli/test/generate.test.js`：
```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const stacks = require('../stacks');
const { generate } = require('../lib/generate');

const TEMPLATE_ROOT = path.join(__dirname, '..', '..', 'template');

function makePng(p) {
  fs.writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

/** 递归判断目录下任一 .kt 文件是否含指定子串（替代 shell grep）。 */
function anyKtContains(dir, needle) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (anyKtContains(full, needle)) {
        return true;
      }
    } else if (e.name.endsWith('.kt') && fs.readFileSync(full, 'utf8').includes(needle)) {
      return true;
    }
  }
  return false;
}

test('generate 生成壳+H5、改写 app 包/applicationId/名称/图标，保留库包', () => {
  const parent = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gen-')), 'tourapp');
  const icon = path.join(os.tmpdir(), `icon-${Date.now()}.png`);
  makePng(icon);

  generate({
    templateRoot: TEMPLATE_ROOT,
    parentDir: parent,
    appId: 'com.chances.tour',
    appName: '旅游助手',
    iconPath: icon,
    stack: 'android-support-vue',
    registry: stacks,
  });

  const shell = path.join(parent, 'android-shell');
  // 壳 + H5 都拷了
  assert.ok(fs.existsSync(path.join(shell, 'app/build.gradle')));
  assert.ok(fs.existsSync(path.join(parent, 'h5-vue/package.json')));
  // 构建产物被排除
  assert.ok(!fs.existsSync(path.join(parent, 'h5-vue/node_modules')));
  assert.ok(!fs.existsSync(path.join(shell, 'app/build')));
  // app 模块包重写
  assert.ok(fs.existsSync(path.join(shell, 'app/src/main/java/com/chances/tour/OttApplication.kt')));
  assert.ok(!fs.existsSync(path.join(shell, 'app/src/main/java/com/chances/shell')));
  // applicationId / 名称 / 图标
  const gradle = fs.readFileSync(path.join(shell, 'app/build.gradle'), 'utf8');
  assert.match(gradle, /applicationId 'com\.chances\.tour'/);
  const strings = fs.readFileSync(path.join(shell, 'app/src/main/res/values/strings.xml'), 'utf8');
  assert.match(strings, /<string name="app_name">旅游助手<\/string>/);
  const manifest = fs.readFileSync(path.join(shell, 'app/src/main/AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /package="com\.chances\.tour"/);
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher_tour"/);
  assert.ok(fs.existsSync(path.join(shell, 'app/src/main/res/mipmap-xxhdpi/ic_launcher_tour.png')));
  assert.ok(!fs.existsSync(path.join(shell, 'app/src/main/res/mipmap-xxhdpi/ic_launcher_shell.png')));
  // 库包保留 com.chances.shell
  assert.ok(fs.existsSync(path.join(shell, 'lib_base/src/main/java/com/chances/shell/base')),
    'lib_base 包路径应保持 com.chances.shell.base');
  // app 源码不应残留 com.chances.shell
  assert.strictEqual(anyKtContains(path.join(shell, 'app/src/main/java'), 'com.chances.shell'), false);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/generate.test.js`
Expected: FAIL（`Cannot find module '../lib/generate'`）。

- [ ] **Step 3: 实现 generate.js**

`cli/lib/generate.js`：
```js
const fs = require('node:fs');
const path = require('node:path');
const { validateAppId, validateStack, validateParent, validateIcon } = require('./validate');
const { copyTree, DEFAULT_EXCLUDES } = require('./copyTree');
const { renameAppPackage } = require('./renameAppPackage');
const { iconKeyFromAppId } = require('./iconKey');
const { setApplicationId, setManifestPackage, setAppName, setLauncherIcon } = require('./textEdits');

const BASE_PKG = 'com.chances.shell';

/**
 * 生成壳+H5 工程并定制 applicationId / 名称 / 图标。
 *
 * @param o.templateRoot 模板源根（含 android-shell / h5-vue）
 * @param o.parentDir 目标父目录（工程根）
 * @param o.appId applicationId
 * @param o.appName 应用名
 * @param o.iconPath 图标 PNG 路径
 * @param o.stack 技术栈名
 * @param o.registry 技术栈注册表
 * @return { shellDir, h5Dir, iconKey }
 * @throws Error 任一输入校验失败
 */
function generate(o) {
  const err = validateStack(o.stack, o.registry)
    || validateAppId(o.appId)
    || validateParent(o.parentDir)
    || validateIcon(o.iconPath);
  if (err) {
    throw new Error(err);
  }
  const def = o.registry[o.stack];

  const shellDir = path.join(o.parentDir, def.shell);
  const h5Dir = path.join(o.parentDir, def.h5);
  copyTree(path.join(o.templateRoot, def.shell), shellDir, DEFAULT_EXCLUDES);
  copyTree(path.join(o.templateRoot, def.h5), h5Dir, DEFAULT_EXCLUDES);

  renameAppPackage(path.join(shellDir, 'app/src/main/java'), BASE_PKG, o.appId);

  edit(path.join(shellDir, 'app/build.gradle'), (t) => setApplicationId(t, o.appId));
  edit(path.join(shellDir, 'app/src/main/res/values/strings.xml'), (t) => setAppName(t, o.appName));

  const iconKey = iconKeyFromAppId(o.appId);
  const manifest = path.join(shellDir, 'app/src/main/AndroidManifest.xml');
  edit(manifest, (t) => setLauncherIcon(setManifestPackage(t, o.appId), `ic_launcher_${iconKey}`));

  const mipmap = path.join(shellDir, 'app/src/main/res/mipmap-xxhdpi');
  fs.rmSync(path.join(mipmap, 'ic_launcher_shell.png'), { force: true });
  fs.copyFileSync(o.iconPath, path.join(mipmap, `ic_launcher_${iconKey}.png`));

  return { shellDir, h5Dir, iconKey };
}

/** 读文件、应用纯文本变换 fn、写回。 */
function edit(file, fn) {
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}

module.exports = { generate };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test test/generate.test.js`
Expected: PASS（1 test）。若 FAIL 提示残留 `com.chances.shell`，检查部分 A（Task 1）是否已把模板基线改干净。

- [ ] **Step 5: 全量测试**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test`
Expected: 所有测试 PASS。

- [ ] **Step 6: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/lib/generate.js cli/test/generate.test.js
git commit -m "feat(cli): 编排器 generate + e2e 测试"
```

---

### Task 10: CLI 入口 index.js + 文档

**Files:**
- Create: `cli/index.js`
- Create: `cli/README.md`

- [ ] **Step 1: 实现 index.js（参数解析 + 交互补齐 + 调用 generate）**

`cli/index.js`：
```js
#!/usr/bin/env node
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { parseArgs } = require('node:util');
const stacks = require('./stacks');
const { generate } = require('./lib/generate');

const TEMPLATE_ROOT = path.join(__dirname, '..', 'template');

/** 交互式询问一个必填项，为空则重复询问；已有 preset 直接返回。 */
async function ask(rl, label, preset) {
  if (preset) {
    return preset;
  }
  let v = '';
  while (!v) {
    v = (await rl.question(`${label}: `)).trim();
  }
  return v;
}

/** CLI 主流程：解析 flag → 交互补齐缺项 → 生成工程 → 打印后续步骤。 */
async function main() {
  const { values } = parseArgs({
    options: {
      parent: { type: 'string' },
      'app-id': { type: 'string' },
      name: { type: 'string' },
      icon: { type: 'string' },
      stack: { type: 'string', default: 'android-support-vue' },
    },
  });

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const parentName = await ask(rl, '父目录名（工程根）', values.parent);
    const appId = await ask(rl, 'applicationId（如 com.chances.tour）', values['app-id']);
    const appName = await ask(rl, '应用名', values.name);
    const iconPath = await ask(rl, '图标 PNG 路径', values.icon);

    const res = generate({
      templateRoot: TEMPLATE_ROOT,
      parentDir: path.resolve(parentName),
      appId,
      appName,
      iconPath: path.resolve(iconPath),
      stack: values.stack,
      registry: stacks,
    });

    const def = stacks[values.stack];
    stdout.write([
      '',
      `✓ 已生成：${path.resolve(parentName)}`,
      `  壳：${res.shellDir}`,
      `  H5：${res.h5Dir}`,
      `  图标资源：ic_launcher_${res.iconKey}`,
      '',
      '后续手动步骤：',
      `  1. 按 README 绑定表拷 rules/skill 到目标 .claude/：rules=${def.rules.join(',')} skill=${def.skill.join(',')}`,
      '  2. 设 H5 vite.config.ts 的 base（须与壳 H5_URL 路径一致）',
      '  3. 替换签名 keystore（app/shell.jks 为 demo 非生产密钥）',
      '',
    ].join('\n'));
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  process.stderr.write(`✗ ${e.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 2: 手动冒烟（非交互全 flag）**

Run:
```bash
cd /Users/chances/StudioProjects/ai-android/cli
node -e 'const fs=require("fs");fs.writeFileSync("/tmp/smoke-icon.png",Buffer.from([137,80,78,71,13,10,26,10]))'
rm -rf /tmp/smoke-proj
node index.js --parent /tmp/smoke-proj/myapp --app-id com.chances.demo --name 演示 --icon /tmp/smoke-icon.png
ls /tmp/smoke-proj/myapp
grep applicationId /tmp/smoke-proj/myapp/android-shell/app/build.gradle
ls /tmp/smoke-proj/myapp/android-shell/app/src/main/java/com/chances/demo
```
Expected: 打印 `✓ 已生成`；目录含 `android-shell` 与 `h5-vue`；applicationId 为 `com.chances.demo`；app 源码在 `com/chances/demo`。

- [ ] **Step 3: 写 cli/README.md**

`cli/README.md`：
````markdown
# create-android-shell

脚手架：按技术栈生成「Android WebView 套壳 + H5」模板工程，定制 applicationId / 应用名 / 图标。

## 用法

```bash
cd cli && npm link    # 本地全局安装（一次）
create-android-shell --parent ./myapp --app-id com.chances.tour --name 旅游助手 --icon ./logo.png
# 或省略 flag 进入交互补齐
create-android-shell
```

flag：`--parent` 工程根目录｜`--app-id` applicationId｜`--name` 应用名｜`--icon` 图标 PNG｜`--stack` 技术栈（默认 android-support-vue）。

## 行为

- 拷壳 + H5 到 `<parent>/`，排除 build/.gradle/.idea/node_modules/dist/*.iml/local.properties
- **只重写 app 模块**包名为 applicationId；lib_base/feature_voice 保持 `com.chances.shell`
- 图标落 `mipmap-xxhdpi/ic_launcher_<appId末段>.png`（唯一名防同步覆盖）
- H5 层只拷贝，base/标题/config 等 TODO 由用户后续改

## 扩展技术栈

编辑 `stacks.js` 加一条（如 `android-support-react` → `template/h5-react/`），主流程零改动。

## 测试

`npm test`（`node --test`，仅 Node 内置模块，需 Node ≥18）。
````

- [ ] **Step 4: 验证 + 全量测试**

Run: `cd /Users/chances/StudioProjects/ai-android/cli && node --test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/chances/StudioProjects/ai-android
git add cli/index.js cli/README.md
git commit -m "feat(cli): CLI 入口 index + 用法文档"
```

---

## 自检对照（spec 覆盖）

- A.1 全模块包名 → Task 1 ✓
- A.2 唯一名图标 → Task 2 ✓
- A.3 文档同步 → Task 2 Step 3 ✓
- B.1 cli/ 位置形态 → Task 3 ✓
- B.2 技术栈注册表 → Task 3 ✓
- B.3 输入（flag+交互） → Task 10 ✓
- B.4 生成流程（拷贝排除/app 包重写/gradle/manifest/strings/图标/提示） → Task 7/8/9/10 ✓
- B.5 错误处理（appId/icon/parent/stack） → Task 4 + generate 校验 ✓
- B.6 验证（grep 零残留/app 包=appId/库包保留/图标唯一名） → Task 1 Step5、Task 9 e2e ✓
- 范围边界（不多密度/不改 H5 内容/不自动拷 rules/不发 npm） → 计划内均遵守 ✓
```

