const { test } = require('node:test');
const assert = require('node:assert');
const { iconKeyFromAppId } = require('../lib/iconKey');

test('取 applicationId 末段并 sanitize 成 [a-z0-9_]', () => {
  assert.strictEqual(iconKeyFromAppId('com.chances.tour'), 'tour');
  assert.strictEqual(iconKeyFromAppId('com.foo.Bar-X'), 'bar_x');
  assert.strictEqual(iconKeyFromAppId('com.a.b2c'), 'b2c');
});
