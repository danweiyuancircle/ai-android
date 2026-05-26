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
