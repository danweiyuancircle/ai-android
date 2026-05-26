#!/usr/bin/env node
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { parseArgs } = require('node:util');
const stacks = require('./stacks');
const { generate } = require('./lib/generate');

const TEMPLATE_ROOT = path.join(__dirname, '..', 'template');

/** 交互式询问一个必填项，为空则重复询问；已有 preset 直接返回。 */
async function ask(rl, label, preset) {
  if (preset) {
    return preset;
  }
  let v = '';
  while (!v) {
    v = (await rl.question(`${label}: `)).trim();
  }
  return v;
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
    },
  });

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const parentName = await ask(rl, '父目录名（工程根）', values.parent);
    const appId = await ask(rl, 'applicationId（如 com.chances.tour）', values['app-id']);
    const appName = await ask(rl, '应用名', values.name);
    const iconPath = await ask(rl, '图标 PNG 路径', values.icon);

    const res = generate({
      templateRoot: TEMPLATE_ROOT,
      parentDir: path.resolve(parentName),
      appId,
      appName,
      iconPath: path.resolve(iconPath),
      stack: values.stack,
      registry: stacks,
    });

    const def = stacks[values.stack];
    stdout.write([
      '',
      `✓ 已生成：${path.resolve(parentName)}`,
      `  壳：${res.shellDir}`,
      `  H5：${res.h5Dir}`,
      `  图标资源：ic_launcher_${res.iconKey}`,
      '',
      '后续手动步骤：',
      `  1. 按 README 绑定表拷 rules/skill 到目标 .claude/：rules=${def.rules.join(',')} skill=${def.skill.join(',')}`,
      '  2. 设 H5 vite.config.ts 的 base（须与壳 H5_URL 路径一致）',
      '  3. 替换签名 keystore（app/shell.jks 为 demo 非生产密钥）',
      '',
    ].join('\n'));
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  process.stderr.write(`✗ ${e.message}\n`);
  process.exit(1);
});
