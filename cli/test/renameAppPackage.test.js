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
  assert.ok(!fs.existsSync(path.join(root, 'com/chances')), '空中间目录 com/chances 应被裁剪');

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
