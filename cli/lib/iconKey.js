/**
 * 由 applicationId 推导图标资源 key（取末段，非 [a-z0-9_] 字符转 _）。
 *
 * 用于命名 ic_launcher_<key>.png，保证按 applicationId 唯一，防被盒子应用同步按通用名覆盖。
 *
 * @param appId applicationId，如 com.chances.tour
 * @return 资源 key，如 tour
 */
function iconKeyFromAppId(appId) {
  const last = appId.slice(appId.lastIndexOf('.') + 1);
  return last.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

module.exports = { iconKeyFromAppId };
