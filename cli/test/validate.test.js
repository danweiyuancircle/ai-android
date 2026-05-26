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
