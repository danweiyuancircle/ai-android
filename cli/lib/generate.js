const fs = require('node:fs');
const path = require('node:path');
const { validateAppId, validateStack, validateParent, validateIcon } = require('./validate');
const { copyTree, DEFAULT_EXCLUDES } = require('./copyTree');
const { renameAppPackage } = require('./renameAppPackage');
const { iconKeyFromAppId } = require('./iconKey');
const { setApplicationId, setManifestPackage, setAppName, setLauncherIcon } = require('./textEdits');

const BASE_PKG = 'com.chances.shell';

/**
 * 各可选项默认值（沿用模板基线）。供 CLI 交互提示展示，保持与生成行为一致。
 * iconSizeHint：图标建议尺寸（mipmap-xxhdpi 标准启动图标）。
 */
const DEFAULTS = {
  appId: BASE_PKG,
  appName: 'Shell Template',
  iconDesc: '使用模板内置占位图标 ic_launcher_shell',
  iconSizeHint: '144×144 PNG（mipmap-xxhdpi 密度）',
};

/**
 * 生成壳+H5 工程并定制 applicationId / 名称 / 图标。
 *
 * applicationId / 应用名 / 图标均可选：缺省时分别用 [DEFAULTS.appId]、[DEFAULTS.appName]、保留模板占位图标。
 *
 * @param o.templateRoot 模板源根（含 android-app / web）
 * @param o.parentDir 目标父目录（工程根）
 * @param o.appId applicationId，缺省回退 com.chances.shell
 * @param o.appName 应用名，缺省回退 Shell Template
 * @param o.iconPath 图标 PNG 路径，缺省则保留模板内置 ic_launcher_shell（不改 manifest 图标名）
 * @param o.stack 技术栈名
 * @param o.registry 技术栈注册表
 * @return { shellDir, h5Dir, iconKey }
 * @throws Error 任一输入校验失败
 *
 * 已知约束：BASE_PKG 绑定模板基线包名 com.chances.shell（单模板假设）；图标仅替换 mipmap-xxhdpi 单密度。
 */
function generate(o) {
  const appId = o.appId || DEFAULTS.appId;
  const appName = o.appName || DEFAULTS.appName;
  const iconPath = o.iconPath || null;

  const err = validateStack(o.stack, o.registry)
    || validateAppId(appId)
    || validateParent(o.parentDir)
    || (iconPath ? validateIcon(iconPath) : null);
  if (err) {
    throw new Error(err);
  }
  const def = o.registry[o.stack];

  const shellDir = path.join(o.parentDir, def.shell);
  const h5Dir = path.join(o.parentDir, def.h5);
  copyTree(path.join(o.templateRoot, def.shell), shellDir, DEFAULT_EXCLUDES);
  copyTree(path.join(o.templateRoot, def.h5), h5Dir, DEFAULT_EXCLUDES);

  renameAppPackage(path.join(shellDir, 'app/src/main/java'), BASE_PKG, appId);

  edit(path.join(shellDir, 'app/build.gradle'), (t) => setApplicationId(t, appId));
  edit(path.join(shellDir, 'app/src/main/res/values/strings.xml'), (t) => setAppName(t, appName));

  // 提供自定义图标 → 用 appId 末段命名唯一资源；否则沿用模板占位 ic_launcher_shell
  const iconKey = iconPath ? iconKeyFromAppId(appId) : 'shell';
  const manifest = path.join(shellDir, 'app/src/main/AndroidManifest.xml');
  edit(manifest, (t) => setLauncherIcon(setManifestPackage(t, appId), `ic_launcher_${iconKey}`));

  if (iconPath) {
    const mipmap = path.join(shellDir, 'app/src/main/res/mipmap-xxhdpi');
    if (iconKey !== 'shell') {
      fs.rmSync(path.join(mipmap, 'ic_launcher_shell.png'), { force: true });
    }
    fs.copyFileSync(iconPath, path.join(mipmap, `ic_launcher_${iconKey}.png`));
  }

  // 工程根 AI 入口：别人把 parent 当工作区即可写代码
  const boilerplate = path.join(__dirname, '..', 'boilerplate');
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    fs.copyFileSync(path.join(boilerplate, name), path.join(o.parentDir, name));
  }

  return { shellDir, h5Dir, iconKey };
}

/** 读文件、应用纯文本变换 fn、写回。 */
function edit(file, fn) {
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}

module.exports = { generate, DEFAULTS };
