#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { stdin, stdout } = require('node:process');
const { parseArgs } = require('node:util');
const stacks = require('./stacks');
const { generate, DEFAULTS } = require('./lib/generate');
const { PLATFORMS, setVoiceConfig } = require('./lib/voiceConfig');
const { listRules, listSkills, RULES_DIR, SKILLS_DIR } = require('./lib/rulesCatalog');
const { TARGETS, applyConfig, writeSkills } = require('./lib/configWrite');
const prompt = require('./lib/prompt');

// 发布到 npm 时模板随包内置在 ./template（见 package.json 的 prepack）；
// 仓库内本地开发（npm link）时回退到同仓库的 ../template。
const BUNDLED_TEMPLATE = path.join(__dirname, 'template');
const TEMPLATE_ROOT = fs.existsSync(BUNDLED_TEMPLATE)
  ? BUNDLED_TEMPLATE
  : path.join(__dirname, '..', 'template');

/** 询问一个必填项；已有 preset 直接返回；非交互环境（无 TTY）缺值则报错（无法提示）。 */
async function ask(label, preset, interactive) {
  if (preset) {
    return preset;
  }
  if (!interactive) {
    throw new Error(`缺少必填项「${label}」，且当前非交互环境（无 TTY），请用对应 flag 传入`);
  }
  return prompt.askText({ message: label, required: true });
}

/** 询问可选项：展示默认值，回车留空取默认；已有 preset（flag 传入）直接返回；非交互环境直接取默认，不提示。 */
async function askDefault(label, def, defLabel, preset, interactive) {
  if (preset !== undefined) {
    return preset;
  }
  if (!interactive) {
    return def;
  }
  return prompt.askText({ message: `${label}（默认：${defLabel ?? def}）`, defaultValue: def });
}

/**
 * 语音配置交互：先选引擎（视九/OTT），OTT 再选云平台并逐项填密钥（可留空）。
 * flag 优先（--voice / --voice-platform）；非交互且无 flag 默认不启用。
 * @return { engine, platform?, keys? } 供 setVoiceConfig 写入 gradle.properties
 */
async function askVoice(flags, interactive) {
  let engine = flags.voice;
  if (!engine) {
    if (!interactive) {
      return { engine: 'none' };
    }
    engine = await prompt.askSelect({
      message: '语音引擎',
      options: [
        { value: 'none', label: '不启用' },
        { value: 'shijiu', label: '视九' },
        { value: 'internet', label: 'OTT 互联网' },
      ],
      initialValue: 'none',
    });
  }
  if (engine === 'none' || engine === '') {
    return { engine: 'none' };
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
      platform = await prompt.askSelect({
        message: 'OTT 云平台',
        options: order.map((k) => ({ value: k, label: PLATFORMS[k].label })),
        initialValue: order[0],
      });
    }
  }
  if (!PLATFORMS[platform]) {
    throw new Error(`未知语音平台「${platform}」，可选 ${order.join('|')}`);
  }

  const keys = {};
  if (interactive) {
    for (const { prop, label } of PLATFORMS[platform].keys) {
      keys[prop] = await prompt.askPassword(`${label}（可留空）`);
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
 * 多选交互（@clack 原生勾选：上下键导航、空格勾选、回车确认，中文对齐正确）。
 * @param defaults 默认勾选的项（其元素须在 full 内）
 * @return 选中项数组
 */
async function askMultiSelect(label, full, defaults, interactive) {
  if (!interactive) {
    return defaults;
  }
  if (!full.length) {
    return [];
  }
  return prompt.askMultiSelect({
    message: label,
    options: full.map((name) => ({ value: name, label: name })),
    initialValues: defaults,
  });
}

/** 选平台：flag(--target) 优先；交互多选；非交互回退默认（claude）。 */
async function askTargets(flags, interactive, defaults) {
  const full = Object.keys(TARGETS);
  const fromFlag = parseListFlag(flags.target, full, '平台');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect('AI 平台', full, defaults, interactive);
}

/** 选 rules：flag(--rules) 优先；交互多选；非交互回退 stack 默认。 */
async function askRules(flags, interactive, defaults) {
  const full = listRules();
  const fromFlag = parseListFlag(flags.rules, full, '规则');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect('rules', full, defaults, interactive);
}

/** 选 skills：flag(--skills) 优先；交互多选；非交互回退 stack 默认。 */
async function askSkills(flags, interactive, defaults) {
  const full = listSkills();
  const fromFlag = parseListFlag(flags.skills, full, 'skill');
  if (fromFlag !== undefined) {
    return fromFlag;
  }
  return askMultiSelect('skills', full, defaults, interactive);
}

/** 落地摘要：交互态用 @clack note（带边框），非交互态纯文本（CI 日志友好）。 */
async function printConfigSummary(summary, ruleNames, skillNames, interactive) {
  if (!summary.length) {
    const msg = '未选择任何平台，跳过 rules/skills 落地。';
    if (interactive) {
      await prompt.note(msg, '配置');
    } else {
      stdout.write(`\n${msg}\n`);
    }
    return;
  }
  const body = [
    ...summary.map((s) => `${s.label}: rules-> ${s.rulesDest}  skills-> ${s.skillsDest}`),
    `规则: ${ruleNames.length ? ruleNames.join(', ') : '无'}`,
    `技能: ${skillNames.length ? skillNames.join(', ') : '无'}`,
  ].join('\n');
  if (interactive) {
    await prompt.note(body, 'rules/skills 已落地');
  } else {
    stdout.write(`\nrules/skills 已落地:\n${body}\n`);
  }
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

  // --config：不生成工程，只对已有工程补 rules/skills 配置
  if (values.config) {
    const projectDir = path.resolve(values.parent || '.');
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      throw new Error(`--config 目标工程不存在或非目录：${projectDir}`);
    }
    if (interactive) {
      await prompt.intro('create-android-shell · 为已有工程补 rules/skills');
      await prompt.logStep('选择平台与规则');
    }
    const targets = await askTargets(values, interactive, ['claude']);
    const ruleNames = await askRules(values, interactive, []);
    const skillNames = await askSkills(values, interactive, []);

    let summary;
    if (interactive) {
      const s = await prompt.spinner();
      s.start('落地拷贝中…');
      summary = applyConfig({
        projectDir, targets, ruleNames, skillNames,
        rulesSrcDir: RULES_DIR, skillsSrcDir: SKILLS_DIR, overwrite: values.force,
      });
      s.stop('已落地');
    } else {
      summary = applyConfig({
        projectDir, targets, ruleNames, skillNames,
        rulesSrcDir: RULES_DIR, skillsSrcDir: SKILLS_DIR, overwrite: values.force,
      });
    }
    await printConfigSummary(summary, ruleNames, skillNames, interactive);
    if (interactive) {
      await prompt.outro('配置完成');
    }
    return;
  }

  if (interactive) {
    await prompt.intro('create-android-shell · Android 套壳脚手架');
    await prompt.logStep('1/4 工程信息');
  }
  // 父目录必填；applicationId / 应用名 / 图标可选，留空用默认
  const parentName = await ask('父目录名（工程根）', values.parent, interactive);
  const appId = await askDefault('applicationId（如 com.chances.tour）', DEFAULTS.appId, undefined, values['app-id'], interactive);
  const appName = await askDefault('应用名', DEFAULTS.appName, undefined, values.name, interactive);
  const iconPath = await askDefault(
    `图标 PNG 路径（尺寸要求 ${DEFAULTS.iconSizeHint}）`,
    '',
    DEFAULTS.iconDesc,
    values.icon,
    interactive,
  );

  if (interactive) {
    await prompt.logStep('2/4 语音配置');
  }
  const voice = await askVoice(values, interactive);

  // 选 AI 平台 + rules + skills（stack 自带项作默认勾选）
  if (interactive) {
    await prompt.logStep('3/4 平台与规则');
  }
  const def = stacks[values.stack] || {};
  const targets = await askTargets(values, interactive, ['claude']);
  const ruleNames = await askRules(values, interactive, def.rules || []);
  const skillNames = await askSkills(values, interactive, def.skill || []);

  const s = interactive ? await prompt.spinner() : null;
  if (s) {
    s.start('4/4 生成工程…');
  }
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
  if (s) {
    s.message('写入语音配置…');
  }
  const gradleProps = path.join(res.shellDir, 'gradle.properties');
  fs.writeFileSync(gradleProps, setVoiceConfig(fs.readFileSync(gradleProps, 'utf8'), voice));
  const voiceDesc = voice.engine === 'internet'
    ? `OTT互联网（${PLATFORMS[voice.platform].label}）`
    : voice.engine === 'none'
      ? '不启用'
      : '视九 shijiu';

  // rules/skills 落地到工程根（新工程目录本空，overwrite:true）
  let summary = [];
  if (targets.length) {
    if (s) {
      s.message('落地 rules/skills…');
    }
    summary = applyConfig({
      projectDir: path.resolve(parentName),
      targets,
      ruleNames,
      skillNames,
      rulesSrcDir: RULES_DIR,
      skillsSrcDir: SKILLS_DIR,
      overwrite: true,
    });
    // Grok / Codex 读 .agents/skills；Claude 已写在 .claude/skills
    if (skillNames.length && !targets.includes('cursor') && !targets.includes('codex')) {
      writeSkills({
        projectDir: path.resolve(parentName),
        skillNames,
        skillsSrcDir: SKILLS_DIR,
        skillsDest: '.agents/skills',
        overwrite: true,
      });
    }
  }
  if (s) {
    s.stop('工程已生成');
  }

  stdout.write([
    '',
    `✓ 已生成：${path.resolve(parentName)}`,
    `  Android：${res.shellDir}`,
    `  Web：${res.h5Dir}`,
    `  图标资源：ic_launcher_${res.iconKey}`,
    `  语音引擎：${voiceDesc}`,
    '',
  ].join('\n'));
  await printConfigSummary(summary, ruleNames, skillNames, interactive);
  const steps = [
    '',
    '后续手动步骤：',
    '  1. 设 H5 vite.config.ts 的 base（须与壳 H5_URL 路径一致）',
    '  2. 替换签名 keystore（app/shell.jks 为 demo 非生产密钥）',
    '',
  ].join('\n');
  if (interactive) {
    await prompt.note(steps.trim(), '后续步骤');
    await prompt.outro(`完成 → ${path.resolve(parentName)}`);
  } else {
    stdout.write(steps);
  }
}

main().catch((e) => {
  process.stderr.write(`✗ ${e.message}\n`);
  process.exit(1);
});
