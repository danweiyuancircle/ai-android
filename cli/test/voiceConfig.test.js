const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { PLATFORMS, setVoiceConfig } = require('../lib/voiceConfig');

// 真实模板：发布包内 cli/template，仓库内回退 ../template
const bundled = path.join(__dirname, '..', 'template', 'android-shell', 'gradle.properties');
const REAL_TEMPLATE = fs.existsSync(bundled)
  ? bundled
  : path.join(__dirname, '..', '..', 'template', 'android-shell', 'gradle.properties');

// 模板 gradle.properties 的语音段最小样本（字段名须与模板一致）
const SAMPLE = [
  'voice.engine=shijiu',
  'voice.internet.asrMode=IFLY',
  'voice.internet.ttsMode=IFLY',
  'voice.internet.networkPort=9527',
  'voice.internet.ifly.appId=',
  'voice.internet.ifly.apiKey=',
  'voice.internet.ifly.apiSecret=',
  'voice.internet.tencent.secretId=',
  'voice.internet.tencent.secretKey=',
  'voice.internet.tencent.appId=',
  'voice.internet.volc.appId=',
  'voice.internet.volc.token=',
].join('\n');

function val(text, key) {
  const m = text.match(new RegExp(`^${key.replace(/[.]/g, '\\.')}=(.*)$`, 'm'));
  return m ? m[1] : undefined;
}

test('shijiu：只改 engine，internet 段不变', () => {
  const out = setVoiceConfig(SAMPLE, { engine: 'shijiu' });
  assert.strictEqual(val(out, 'voice.engine'), 'shijiu');
  assert.strictEqual(val(out, 'voice.internet.asrMode'), 'IFLY'); // 原样
  assert.strictEqual(val(out, 'voice.internet.ifly.appId'), '');
});

test('internet + 讯飞 + 填全 key', () => {
  const out = setVoiceConfig(SAMPLE, {
    engine: 'internet',
    platform: 'ifly',
    keys: {
      'voice.internet.ifly.appId': 'A1',
      'voice.internet.ifly.apiKey': 'K1',
      'voice.internet.ifly.apiSecret': 'S1',
    },
  });
  assert.strictEqual(val(out, 'voice.engine'), 'internet');
  assert.strictEqual(val(out, 'voice.internet.asrMode'), 'IFLY');
  assert.strictEqual(val(out, 'voice.internet.ttsMode'), 'IFLY');
  assert.strictEqual(val(out, 'voice.internet.ifly.appId'), 'A1');
  assert.strictEqual(val(out, 'voice.internet.ifly.apiKey'), 'K1');
  assert.strictEqual(val(out, 'voice.internet.ifly.apiSecret'), 'S1');
});

test('internet + 火山 + 留空 key：mode 写入、key 行保持空', () => {
  const out = setVoiceConfig(SAMPLE, { engine: 'internet', platform: 'volc', keys: {} });
  assert.strictEqual(val(out, 'voice.internet.asrMode'), 'VOLC');
  assert.strictEqual(val(out, 'voice.internet.ttsMode'), 'VOLC');
  assert.strictEqual(val(out, 'voice.internet.volc.appId'), '');
  assert.strictEqual(val(out, 'voice.internet.volc.token'), '');
});

test('未知平台报错', () => {
  assert.throws(() => setVoiceConfig(SAMPLE, { engine: 'internet', platform: 'nope' }), /未知语音平台/);
});

test('字段名与真实模板 gradle.properties 一致（防 typo）', () => {
  const real = fs.readFileSync(REAL_TEMPLATE, 'utf8');
  for (const key of ['voice.engine', 'voice.internet.asrMode', 'voice.internet.ttsMode']) {
    assert.ok(val(real, key) !== undefined, `模板缺字段 ${key}`);
  }
  for (const p of Object.values(PLATFORMS)) {
    for (const { prop } of p.keys) {
      assert.ok(val(real, prop) !== undefined, `模板缺字段 ${prop}`);
    }
  }
});
