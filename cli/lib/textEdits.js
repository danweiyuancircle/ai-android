/**
 * gradle / manifest / strings 的纯文本变换。每个函数 string -> string，不碰文件系统。
 */

/** 替换 app/build.gradle 的 applicationId（兼容单双引号），统一输出单引号。 */
function setApplicationId(text, appId) {
  return text.replace(/applicationId\s+['"][^'"]*['"]/, `applicationId '${appId}'`);
}

/** 替换 AndroidManifest 根标签的 package 属性（首个 package=）。 */
function setManifestPackage(text, pkg) {
  return text.replace(/package="[^"]*"/, `package="${pkg}"`);
}

/** 替换 strings.xml 的 app_name 文案。 */
function setAppName(text, name) {
  return text.replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${name}$2`);
}

/** 替换 application 的 android:icon 为 @mipmap/<resName>。 */
function setLauncherIcon(text, resName) {
  return text.replace(/android:icon="[^"]*"/, `android:icon="@mipmap/${resName}"`);
}

module.exports = { setApplicationId, setManifestPackage, setAppName, setLauncherIcon };
