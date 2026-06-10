#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { parseArgs } = require('node:util');
const stacks = require('./stacks');
const { generate, DEFAULTS } = require('./lib/generate');
const { PLATFORMS, setVoiceConfig } = require('./lib/voiceConfig');
const { listRules, listSkills, RULES_DIR, SKILLS_DIR } = require('./lib/rulesCatalog');
const { TARGETS, applyConfig } = require('./lib/configWrite');

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

/**
 * 解析 flag 形式的多选值（逗号分隔）：'all' 展开为 full 全集，逗号列表逐项校验须在 full 内。
 * @return string[] | undefined（flag 未传时 undefined，交由调用方走交互/默认）
 */
function parseListFlag(raw, full, kindLabel) {
  if (raw === undefined) {
    return undefined;
  }
  if (raw.trim() === 'all') {
    return full.slice();
  }
  const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const it of items) {
    if (!full.includes(it)) {
      throw new Error(`未知${kindLabel}「${it}」，可选 ${full.join(', ')} 或 all`);
    }
  }
  return items;
}

/**
 * 编号多选交互：展示带默认勾选的清单，输入如 `1,3` 选取，回车取默认勾选，`all` 全选，`none` 清空。
 * @param defaults 默认勾选的项（其元素须在 full 内）
 * @return 选中项数组
 */
async function askMultiSelect(rl, label, full, defaults, interactive) {
  if (!interactive) {
    return defaults;
  }
  if (!full.length) {
    return [];
  }
  const defSet = new Set(defaults);
  const lines = full.map((name, i) => `  ${i + 1}. ${defSet.has(name) ? '[x]' : '[ ]'} ${name}`);
  const defHint = defaults.length ? defaults.join(',') : '无';
  const ans = (await rl.question(
    `${label}（输入编号如 1,3；回车取默认[${defHint}]；all 全选；none 不选）:\n${lines.join('\n')}\n> `,
  )).trim();
  if (!ans) {
    return defaults;
  }
  if (ans === 'all') {
    return full.slice();
  }
  if (ans === 'none') {
    return [];
  }
  const picked = [];
  for (const tok of ans.split(',').map((s) => s.trim()).filter(Boolean)) {
    const idx = Number(tok);
    if (!Number.isInteger(idx) || idx < 1 || idx > full.length) {
      throw new Error(`非法编号「${tok}」，范围 1-${full.length}`);
    }
    const name = full[idx - 1];
    if (!picked.includes(name)) {
      picked.push(name);
    }
  }
  return picked;
}

/** 选平台：flag(--target) 优先；交互多选；非交互回退默认（claude）。 */
async function askTargets(rl, flags, interactive, defaults) {
  const full = Object.keys(TARGETS);
  const fromFlag = parseListFlag(flags.target, full, '平台');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect(rl, 'AI 平台', full, defaults, interactive);
}

/** 选 rules：flag(--rules) 优先；交互多选；非交互回退 stack 默认。 */
async function askRules(rl, flags, interactive, defaults) {
  const full = listRules();
  const fromFlag = parseListFlag(flags.rules, full, '规则');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect(rl, 'rules', full, defaults, interactive);
}

/** 选 skills：flag(--skills) 优先；交互多选；非交互回退 stack 默认。 */
async function askSkills(rl, flags, interactive, defaults) {
  const full = listSkills();
  const fromFlag = parseListFlag(flags.skills, full, 'skill');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect(rl, 'skills', full, defaults, interactive);
}

/** 打印落地摘要。 */
function printConfigSummary(summary, ruleNames, skillNames) {
  if (!summary.length) {
    stdout.write('\n未选择任何平台，跳过 rules/skills 落地。\n');
    return;
  }
  stdout.write('\n✓ rules/skills 已落地：\n');
  for (const s of summary) {
    stdout.write(`  ${s.label}：rules→${s.rulesDest}　skills→${s.skillsDest}\n`);
  }
  stdout.write(`  规则：${ruleNames.length ? ruleNames.join(', ') : '无'}\n`);
  stdout.write(`  技能：${skillNames.length ? skillNames.join(', ') : '无'}\n`);
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
      target: { type: 'string' },
      rules: { type: 'string' },
      skills: { type: 'string' },
      config: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });

  const interactive = Boolean(stdin.isTTY);
  const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null;
  try {
    // --config：不生成工程，只对已有工程补 rules/skills 配置
    if (values.config) {
      const projectDir = path.resolve(values.parent || '.');
      if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
        throw new Error(`--config 目标工程不存在或非目录：${projectDir}`);
      }
      const targets = await askTargets(rl, values, interactive, ['claude']);
      const ruleNames = await askRules(rl, values, interactive, []);
      const skillNames = await askSkills(rl, values, interactive, []);
      const summary = applyConfig({
        projectDir,
        targets,
        ruleNames,
        skillNames,
        rulesSrcDir: RULES_DIR,
        skillsSrcDir: SKILLS_DIR,
        overwrite: values.force,
      });
      printConfigSummary(summary, ruleNames, skillNames);
      return;
    }

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

    // 选 AI 平台 + rules + skills（stack 自带项作默认勾选）
    const def = stacks[values.stack] || {};
    const targets = await askTargets(rl, values, interactive, ['claude']);
    const ruleNames = await askRules(rl, values, interactive, def.rules || []);
    const skillNames = await askSkills(rl, values, interactive, def.skill || []);

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

    // rules/skills 落地到工程根（新工程目录本空，overwrite:true）
    let summary = [];
    if (targets.length) {
      summary = applyConfig({
        projectDir: path.resolve(parentName),
        targets,
        ruleNames,
        skillNames,
        rulesSrcDir: RULES_DIR,
        skillsSrcDir: SKILLS_DIR,
        overwrite: true,
      });
    }

    stdout.write([
      '',
      `✓ 已生成：${path.resolve(parentName)}`,
      `  壳：${res.shellDir}`,
      `  H5：${res.h5Dir}`,
      `  图标资源：ic_launcher_${res.iconKey}`,
      `  语音引擎：${voiceDesc}`,
      '',
    ].join('\n'));
    printConfigSummary(summary, ruleNames, skillNames);
    stdout.write([
      '',
      '后续手动步骤：',
      '  1. 设 H5 vite.config.ts 的 base（须与壳 H5_URL 路径一致）',
      '  2. 替换签名 keystore（app/shell.jks 为 demo 非生产密钥）',
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
