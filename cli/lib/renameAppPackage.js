const fs = require('node:fs');
const path = require('node:path');

/**
 * 把 app 模块源码包从 oldPkg 重写到 newPkg，只动 app 自有包，不动其依赖的库包。
 *
 * 算法：先扫描 app 源码目录收集「app 自有包精确集合」（全部以 oldPkg 为前缀的已声明包），
 * 再逐文件重写 package 声明与「包部分精确命中自有集合」的 import，最后把目录从 oldPkg 路径移到 newPkg 路径。
 * 库包（com.chances.shell.base / .voice）不在 app 模块目录内，不入自有集合，故 import 它们时原样保留。
 *
 * 约束：不处理 app 自有类的「嵌套类/成员」式 import（本模板无此用法）。
 *
 * @param appJavaRoot app 模块 java 源码根（其下为 com/...）
 * @param oldPkg 旧 app 包名，如 com.chances.shell
 * @param newPkg 新 app 包名（= applicationId）
 */
function renameAppPackage(appJavaRoot, oldPkg, newPkg) {
  const files = listKtFiles(appJavaRoot);
  const owned = new Set();
  for (const f of files) {
    const m = fs.readFileSync(f, 'utf8').match(/^\s*package\s+([\w.]+)/m);
    if (m) {
      owned.add(m[1]);
    }
  }
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, rewrite(src, owned, oldPkg, newPkg));
  }
  moveDir(appJavaRoot, oldPkg, newPkg);
}

/** 递归列出目录下所有 .kt 文件绝对路径。 */
function listKtFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listKtFiles(full));
    } else if (e.name.endsWith('.kt')) {
      out.push(full);
    }
  }
  return out;
}

/** 逐行重写 package 声明与命中自有集合的 import。 */
function rewrite(src, owned, oldPkg, newPkg) {
  return src.split('\n').map((line) => {
    const pkg = line.match(/^(\s*package\s+)([\w.]+)(.*)$/);
    if (pkg && owned.has(pkg[2])) {
      return pkg[1] + swap(pkg[2], oldPkg, newPkg) + pkg[3];
    }
    const imp = line.match(/^(\s*import\s+)([\w.]+(?:\.\*)?)(.*)$/);
    if (imp) {
      const fqn = imp[2];
      // 自有判定：通配 import 的「包」就是 .* 之前的整体；普通 import 的「包」是去掉末段（类名）。
      const candidate = fqn.endsWith('.*')
        ? fqn.slice(0, -2)
        : (fqn.includes('.') ? fqn.slice(0, fqn.lastIndexOf('.')) : fqn);
      if (owned.has(candidate)) {
        return imp[1] + swap(fqn, oldPkg, newPkg) + imp[3];
      }
    }
    return line;
  }).join('\n');
}

/** 把以 oldPkg 开头的全限定名换成 newPkg 开头。 */
function swap(s, oldPkg, newPkg) {
  return newPkg + s.slice(oldPkg.length);
}

/** 把 app 源码目录从 oldPkg 路径移到 newPkg 路径，并清理空残留目录。 */
function moveDir(root, oldPkg, newPkg) {
  const oldPath = path.join(root, ...oldPkg.split('.'));
  const newPath = path.join(root, ...newPkg.split('.'));
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);
  pruneEmptyUp(path.dirname(oldPath), root);
}

/** 从 dir 向上删空目录，直到非空或到达 root（不删 root）。 */
function pruneEmptyUp(dir, root) {
  let cur = dir;
  while (cur.startsWith(root) && cur !== root) {
    if (!fs.existsSync(cur) || fs.readdirSync(cur).length > 0) {
      break;
    }
    fs.rmdirSync(cur);
    cur = path.dirname(cur);
  }
}

module.exports = { renameAppPackage };
