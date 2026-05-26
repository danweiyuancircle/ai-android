const fs = require('node:fs');
const path = require('node:path');

/** 拷贝时排除的目录名 / 文件名 / 通配（构建产物、本地配置）。 */
const DEFAULT_EXCLUDES = {
  names: ['build', '.gradle', '.idea', 'node_modules', 'dist'],
  files: ['local.properties'],
  patterns: [/\.iml$/],
};

/**
 * 递归拷贝目录，按 excludes 跳过构建产物。
 *
 * @param src 源目录
 * @param dest 目标目录
 * @param excludes 形如 DEFAULT_EXCLUDES
 */
function copyTree(src, dest, excludes) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const base = path.basename(s);
      if (excludes.names.includes(base)) {
        return false;
      }
      if (excludes.files.includes(base)) {
        return false;
      }
      return !excludes.patterns.some((re) => re.test(base));
    },
  });
}

module.exports = { copyTree, DEFAULT_EXCLUDES };
