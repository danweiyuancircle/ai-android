const { test } = require('node:test');
const assert = require('node:assert');
const {
  listRules,
  listSkills,
  splitFrontmatter,
  extractDescription,
  isSafeRuleName,
  isSafeSkillName,
} = require('../lib/rulesCatalog');

const FM_FULL = '---\ndescription: Vue 规范\npaths:\n  - "**/*.vue"\n---\n# 标题\n\n正文\n';
const FM_PATHS_ONLY = '---\npaths:\n  - "**/*.kt"\n---\n# 安卓规范\n\n正文\n';
const NO_FM = '# Android 5.0 兼容\n\n适用：...\n';
const NO_FM_COMMENT = '<!-- 注释 -->\n\n# 强制 Support 库\n\n正文\n';

test('splitFrontmatter：全 frontmatter', () => {
  const { frontmatter, body } = splitFrontmatter(FM_FULL);
  assert.match(frontmatter, /description: Vue 规范/);
  assert.strictEqual(body, '# 标题\n\n正文\n');
});

test('splitFrontmatter：仅 paths', () => {
  const { frontmatter, body } = splitFrontmatter(FM_PATHS_ONLY);
  assert.match(frontmatter, /paths:/);
  assert.strictEqual(body, '# 安卓规范\n\n正文\n');
});

test('splitFrontmatter：无 frontmatter 原样返回', () => {
  const { frontmatter, body } = splitFrontmatter(NO_FM);
  assert.strictEqual(frontmatter, null);
  assert.strictEqual(body, NO_FM);
});

test('extractDescription：优先取 frontmatter description', () => {
  assert.strictEqual(extractDescription(FM_FULL, 'fb'), 'Vue 规范');
});

test('extractDescription：无 description 取首个标题', () => {
  assert.strictEqual(extractDescription(FM_PATHS_ONLY, 'fb'), '安卓规范');
  assert.strictEqual(extractDescription(NO_FM, 'fb'), 'Android 5.0 兼容');
});

test('extractDescription：注释在标题前时跳过注释取标题', () => {
  assert.strictEqual(extractDescription(NO_FM_COMMENT, 'fb'), '强制 Support 库');
});

test('extractDescription：全无回退 fallback', () => {
  assert.strictEqual(extractDescription('纯正文无标题\n', 'my-rule'), 'my-rule');
});

test('isSafeRuleName：接受合法、拒非法', () => {
  assert.ok(isSafeRuleName('android-webview-5.md'));
  assert.ok(isSafeRuleName('vue-core.md'));
  assert.ok(!isSafeRuleName('../x.md'));
  assert.ok(!isSafeRuleName('a/b.md'));
  assert.ok(!isSafeRuleName('.hidden.md'));
  assert.ok(!isSafeRuleName('nodmd.txt'));
  assert.ok(!isSafeRuleName(''));
});

test('isSafeSkillName：接受目录名、拒路径', () => {
  assert.ok(isSafeSkillName('chances-sdk'));
  assert.ok(!isSafeSkillName('../etc'));
  assert.ok(!isSafeSkillName('a/b'));
  assert.ok(!isSafeSkillName(''));
});

test('listRules：含已知项、全为 .md', () => {
  const rules = listRules();
  assert.ok(rules.includes('android-dev-spec.md'));
  assert.ok(rules.includes('android-webview-5.md'));
  assert.ok(rules.includes('vue-tv-ui.md'));
  assert.ok(rules.every((n) => n.endsWith('.md')));
});

test('listSkills：含 chances-sdk-v2 与 tv-ui-page-author，仅含有 SKILL.md 的目录', () => {
  const skills = listSkills();
  assert.ok(skills.includes('chances-sdk-v2'));
  assert.ok(skills.includes('tv-ui-page-author'));
});
