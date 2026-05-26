/**
 * 技术栈注册表（可扩展点）。
 *
 * 每个技术栈声明壳模板目录、H5 模板目录，以及配套 rules/skill（仅打印提示用，CLI 不自动拷）。
 * 新增 react = 加一条注册 + 补 template/h5-react/，主流程零改动。
 */
module.exports = {
  'android-support-vue': {
    shell: 'android-shell',
    h5: 'h5-vue',
    rules: ['android-dev-spec.md', 'android-support-library-only.md', 'android-webview-5.md'],
    skill: ['chances-sdk'],
  },
};
