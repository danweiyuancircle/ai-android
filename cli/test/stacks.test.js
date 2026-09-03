const { test } = require('node:test');
const assert = require('node:assert');
const stacks = require('../stacks');

test('默认技术栈 android-support-vue 存在且字段完整', () => {
  const s = stacks['android-support-vue'];
  assert.ok(s, '应注册 android-support-vue');
  assert.strictEqual(s.shell, 'android-app');
  assert.strictEqual(s.h5, 'web');
  assert.ok(Array.isArray(s.rules) && s.rules.length > 0);
  assert.ok(s.rules.includes('vue-tv-ui.md'));
  assert.ok(s.skill.includes('chances-tv-ui'));
});
