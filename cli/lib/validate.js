const fs = require('node:fs');

const APP_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/** 校验 applicationId。合法返回 null，否则返回错误消息。 */
function validateAppId(id) {
  return APP_ID_RE.test(id) ? null : `applicationId 非法（需形如 com.foo.bar，全小写）：${id}`;
}

/** 校验技术栈在注册表中。合法返回 null，否则返回错误消息（含可选值）。 */
function validateStack(name, registry) {
  if (registry[name]) {
    return null;
  }
  return `未知技术栈 ${name}，可选：${Object.keys(registry).join(', ')}`;
}

/** 校验父目录可用（不存在或为空）。可用返回 null，否则返回错误消息。 */
function validateParent(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }
  if (fs.readdirSync(dir).length === 0) {
    return null;
  }
  return `目标目录已存在且非空：${dir}`;
}

/** 校验图标为存在的 PNG 文件（按 magic number）。合法返回 null，否则返回错误消息。 */
function validateIcon(p) {
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
    return `图标文件不存在：${p}`;
  }
  const head = Buffer.alloc(4);
  const fd = fs.openSync(p, 'r');
  try {
    fs.readSync(fd, head, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  return head.equals(PNG_MAGIC) ? null : `图标必须是 PNG：${p}`;
}

module.exports = { validateAppId, validateStack, validateParent, validateIcon };
