const fs = require('node:fs');
const path = require('node:path');
const { validateAppId, validateStack, validateParent, validateIcon } = require('./validate');
const { copyTree, DEFAULT_EXCLUDES } = require('./copyTree');
const { renameAppPackage } = require('./renameAppPackage');
const { iconKeyFromAppId } = require('./iconKey');
const { setApplicationId, setManifestPackage, setAppName, setLauncherIcon } = require('./textEdits');

const BASE_PKG = 'com.chances.shell';

/**
 * 生成壳+H5 工程并定制 applicationId / 名称 / 图标。
 *
 * @param o.templateRoot 模板源根（含 android-shell / h5-vue）
 * @param o.parentDir 目标父目录（工程根）
 * @param o.appId applicationId
 * @param o.appName 应用名
 * @param o.iconPath 图标 PNG 路径
 * @param o.stack 技术栈名
 * @param o.registry 技术栈注册表
 * @return { shellDir, h5Dir, iconKey }
 * @throws Error 任一输入校验失败
 */
function generate(o) {
  const err = validateStack(o.stack, o.registry)
    || validateAppId(o.appId)
    || validateParent(o.parentDir)
    || validateIcon(o.iconPath);
  if (err) {
    throw new Error(err);
  }
  const def = o.registry[o.stack];

  const shellDir = path.join(o.parentDir, def.shell);
  const h5Dir = path.join(o.parentDir, def.h5);
  copyTree(path.join(o.templateRoot, def.shell), shellDir, DEFAULT_EXCLUDES);
  copyTree(path.join(o.templateRoot, def.h5), h5Dir, DEFAULT_EXCLUDES);

  const appJavaDir = path.join(shellDir, 'app/src/main/java');
  renameAppPackage(appJavaDir, BASE_PKG, o.appId);
  // renameAppPackage 精准替换自有包；这里再全量扫一遍，确保 app 模块中对库包的
  // 引用（如 import com.chances.shell.base.*）也改为新 appId 前缀，保证生成目录自洽。
  sweepPkgInKtFiles(appJavaDir, BASE_PKG, o.appId);

  edit(path.join(shellDir, 'app/build.gradle'), (t) => setApplicationId(t, o.appId));
  edit(path.join(shellDir, 'app/src/main/res/values/strings.xml'), (t) => setAppName(t, o.appName));

  const iconKey = iconKeyFromAppId(o.appId);
  const manifest = path.join(shellDir, 'app/src/main/AndroidManifest.xml');
  edit(manifest, (t) => setLauncherIcon(setManifestPackage(t, o.appId), `ic_launcher_${iconKey}`));

  const mipmap = path.join(shellDir, 'app/src/main/res/mipmap-xxhdpi');
  fs.rmSync(path.join(mipmap, 'ic_launcher_shell.png'), { force: true });
  fs.copyFileSync(o.iconPath, path.join(mipmap, `ic_launcher_${iconKey}.png`));

  return { shellDir, h5Dir, iconKey };
}

/** 读文件、应用纯文本变换 fn、写回。 */
function edit(file, fn) {
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}

/** 递归扫描目录下所有 .kt 文件，全量替换字符串 oldPkg → newPkg。 */
function sweepPkgInKtFiles(dir, oldPkg, newPkg) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      sweepPkgInKtFiles(full, oldPkg, newPkg);
    } else if (e.name.endsWith('.kt')) {
      const src = fs.readFileSync(full, 'utf8');
      if (src.includes(oldPkg)) {
        fs.writeFileSync(full, src.split(oldPkg).join(newPkg));
      }
    }
  }
}

module.exports = { generate };
