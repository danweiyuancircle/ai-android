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
