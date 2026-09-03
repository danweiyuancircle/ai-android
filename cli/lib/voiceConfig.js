/**
 * 语音配置写入：把交互选择落到壳工程根 gradle.properties。
 * 纯文本变换（string -> string），不碰文件系统，风格对齐 lib/textEdits.js。
 *
 * 字段来源：template/android-app/gradle.properties 的 voice.* 段，
 * 由 feature_voice/internet/build.gradle 编译期读入 BuildConfig。
 */

/**
 * OTT(internet) 互联网语音的云平台元数据。
 * mode：写入 voice.internet.asrMode / ttsMode 的值（ASR/TTS 同选一家）。
 * keys：该平台的凭证字段（prop=gradle property 全名，label=交互提示文案）。
 */
const PLATFORMS = {
  ifly: {
    mode: 'IFLY',
    label: '讯飞',
    keys: [
      { prop: 'voice.internet.ifly.appId', label: '讯飞 AppId' },
      { prop: 'voice.internet.ifly.apiKey', label: '讯飞 API Key' },
      { prop: 'voice.internet.ifly.apiSecret', label: '讯飞 API Secret' },
    ],
  },
  tencent: {
    mode: 'TENCENT',
    label: '腾讯',
    keys: [
      { prop: 'voice.internet.tencent.secretId', label: '腾讯 SecretId' },
      { prop: 'voice.internet.tencent.secretKey', label: '腾讯 SecretKey' },
      { prop: 'voice.internet.tencent.appId', label: '腾讯 AppId' },
    ],
  },
  volc: {
    mode: 'VOLC',
    label: '火山',
    keys: [
      { prop: 'voice.internet.volc.appId', label: '火山 AppId' },
      { prop: 'voice.internet.volc.token', label: '火山 Token' },
    ],
  },
};

/** 替换 gradle.properties 中某个 `key=...` 行的值（按行匹配，保留 key 与等号）。 */
function setProp(text, key, value) {
  const re = new RegExp(`^(${key.replace(/[.]/g, '\\.')}=).*$`, 'm');
  return text.replace(re, `$1${value}`);
}

/**
 * 按语音选择改写 gradle.properties 文本。
 *
 * @param text gradle.properties 原文
 * @param choice.engine 'shijiu' | 'internet'
 * @param choice.platform 'ifly' | 'tencent' | 'volc'（engine=internet 时必填）
 * @param choice.keys { [prop]: value }（可选，留空的 prop 不写、保持模板空值）
 * @return 新文本
 *
 * shijiu：只改 voice.engine，internet 段原样保留。
 * internet：改 engine + asrMode/ttsMode 为平台 mode，按 keys 填入非空凭证。
 */
function setVoiceConfig(text, choice) {
  let out = setProp(text, 'voice.engine', choice.engine);
  if (choice.engine !== 'internet') {
    return out;
  }
  const platform = PLATFORMS[choice.platform];
  if (!platform) {
    throw new Error(`未知语音平台：'${choice.platform}'，可选 ${Object.keys(PLATFORMS).join('|')}`);
  }
  out = setProp(out, 'voice.internet.asrMode', platform.mode);
  out = setProp(out, 'voice.internet.ttsMode', platform.mode);
  const keys = choice.keys || {};
  for (const { prop } of platform.keys) {
    const v = (keys[prop] || '').trim();
    if (v) {
      out = setProp(out, prop, v);
    }
  }
  return out;
}

module.exports = { PLATFORMS, setVoiceConfig };
