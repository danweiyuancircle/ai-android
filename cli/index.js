#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { parseArgs } = require('node:util');
const stacks = require('./stacks');
const { generate, DEFAULTS } = require('./lib/generate');
const { PLATFORMS, setVoiceConfig } = require('./lib/voiceConfig');

// 发布到 npm 时模板随包内置在 ./template（见 package.json 的 prepack）；
// 仓库内本地开发（npm link）时回退到同仓库的 ../template。
const BUNDLED_TEMPLATE = path.join(__dirname, 'template');
const TEMPLATE_ROOT = fs.existsSync(BUNDLED_TEMPLATE)
  ? BUNDLED_TEMPLATE
  : path.join(__dirname, '..', 'template');

/** 询问一个必填项，为空则重复询问；已有 preset 直接返回；非交互环境（无 TTY）缺值则报错（无法提示）。 */
async function ask(rl, label, preset, interactive) {
  if (preset) {
    return preset;
  }
  if (!interactive) {
    throw new Error(`缺少必填项「${label}」，且当前非交互环境（无 TTY），请用对应 flag 传入`);
  }
  let v = '';
  while (!v) {
    v = (await rl.question(`${label}: `)).trim();
  }
  return v;
}

/** 询问可选项：展示默认值，回车留空取默认；已有 preset（flag 传入）直接返回；非交互环境直接取默认，不提示。 */
async function askDefault(rl, label, def, defLabel, preset, interactive) {
  if (preset !== undefined) {
    return preset;
  }
  if (!interactive) {
    return def;
  }
  const v = (await rl.question(`${label}（默认：${defLabel ?? def}）: `)).trim();
  return v || def;
}

/**
 * 语音配置交互：先选引擎（视九/OTT），OTT 再选云平台并逐项填密钥（可留空）。
 * flag 优先（--voice / --voice-platform）；非交互且无 flag 默认视九 shijiu。
 * @return { engine, platform?, keys? } 供 setVoiceConfig 写入 gradle.properties
 */
async function askVoice(rl, flags, interactive) {
  let engine = flags.voice;
  if (!engine) {
    if (!interactive) {
      return { engine: 'shijiu' };
    }
    const a = (await rl.question('语音引擎（1=视九 / 2=OTT互联网，默认 1）: ')).trim();
    engine = a === '2' ? 'internet' : 'shijiu';
  }
  if (engine !== 'internet') {
    return { engine: 'shijiu' };
  }

  const order = Object.keys(PLATFORMS); // ['ifly','tencent','volc']
  let platform = flags['voice-platform'];
  if (!platform) {
    if (!interactive) {
      platform = order[0];
    } else {
      const menu = order.map((k, i) => `${i + 1}=${PLATFORMS[k].label}`).join(' / ');
      const a = (await rl.question(`OTT 云平台（${menu}，默认 1）: `)).trim();
      platform = order[Number(a) - 1] || order[0];
    }
  }
  if (!PLATFORMS[platform]) {
    throw new Error(`未知语音平台「${platform}」，可选 ${order.join('|')}`);
  }

  const keys = {};
  if (interactive) {
    for (const { prop, label } of PLATFORMS[platform].keys) {
      keys[prop] = await askDefault(rl, `${label}（可留空）`, '', '留空', undefined, interactive);
    }
  }
  return { engine, platform, keys };
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
      voice: { type: 'string' },
      'voice-platform': { type: 'string' },
    },
  });

  const interactive = Boolean(stdin.isTTY);
  const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null;
  try {
    // 父目录必填；applicationId / 应用名 / 图标可选，留空用默认
    const parentName = await ask(rl, '父目录名（工程根）', values.parent, interactive);
    const appId = await askDefault(rl, 'applicationId（如 com.chances.tour）', DEFAULTS.appId, undefined, values['app-id'], interactive);
    const appName = await askDefault(rl, '应用名', DEFAULTS.appName, undefined, values.name, interactive);
    const iconPath = await askDefault(
      rl,
      `图标 PNG 路径（尺寸要求 ${DEFAULTS.iconSizeHint}）`,
      '',
      DEFAULTS.iconDesc,
      values.icon,
      interactive,
    );

    const voice = await askVoice(rl, values, interactive);

    const res = generate({
      templateRoot: TEMPLATE_ROOT,
      parentDir: path.resolve(parentName),
      appId,
      appName,
      iconPath: iconPath ? path.resolve(iconPath) : undefined,
      stack: values.stack,
      registry: stacks,
    });

    // 语音配置写入生成工程的壳根 gradle.properties
    const gradleProps = path.join(res.shellDir, 'gradle.properties');
    fs.writeFileSync(gradleProps, setVoiceConfig(fs.readFileSync(gradleProps, 'utf8'), voice));
    const voiceDesc = voice.engine === 'internet'
      ? `OTT互联网（${PLATFORMS[voice.platform].label}）`
      : '视九 shijiu';

    const def = stacks[values.stack];
    stdout.write([
      '',
      `✓ 已生成：${path.resolve(parentName)}`,
      `  壳：${res.shellDir}`,
      `  H5：${res.h5Dir}`,
      `  图标资源：ic_launcher_${res.iconKey}`,
      `  语音引擎：${voiceDesc}`,
      '',
      '后续手动步骤：',
      `  1. 按 README 绑定表拷 rules/skill 到目标 .claude/：rules=${def.rules.join(',')} skill=${def.skill.join(',')}`,
      '  2. 设 H5 vite.config.ts 的 base（须与壳 H5_URL 路径一致）',
      '  3. 替换签名 keystore（app/shell.jks 为 demo 非生产密钥）',
      '',
    ].join('\n'));
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main().catch((e) => {
  process.stderr.write(`✗ ${e.message}\n`);
  process.exit(1);
});
