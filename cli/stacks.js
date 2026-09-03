/**
 * 技术栈注册表（可扩展点）。
 *
 * 每个技术栈声明壳模板目录、H5 模板目录，以及配套 rules/skill（交互生成时默认勾选，CLI 会落地拷贝）。
 * 新增 react = 加一条注册 + 补 template/h5-react/，主流程零改动。
 */
module.exports = {
  'android-support-vue': {
    /** 仓库 template/ 下的源目录 */
    shell: 'android-shell',
    h5: 'h5-vue',
    /** 生成到工程根下的目录名 */
    destShell: 'android-app',
    destH5: 'web',
    rules: [
      'android-dev-spec.md',
      'android-support-library-only.md',
      'android-webview-5.md',
      'vue-tv-ui.md',
    ],
    skill: ['chances-sdk-v2', 'tv-ui-page-author'],
  },
};
