const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyConfig, toCursorMdc, buildCodexBlock, mergeAgentsMd } = require('../lib/configWrite');
const { RULES_DIR, SKILLS_DIR } = require('../lib/rulesCatalog');

const FM_SRC = '---\ndescription: 旧描述\npaths:\n  - "**/*.vue"\n---\n# 正文标题\n\n正文内容\n';
const NO_FM_SRC = '# 无 frontmatter\n\n正文\n';

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
}

test('toCursorMdc：注入 frontmatter、丢弃原 paths', () => {
  const out = toCursorMdc(FM_SRC, '旧描述');
  assert.ok(out.startsWith('---\ndescription: 旧描述\nalwaysApply: true\n---\n'));
  assert.ok(!out.includes('paths:'));
  assert.ok(out.includes('# 正文标题'));
});

test('toCursorMdc：无 frontmatter 源也产出合法 mdc', () => {
  const out = toCursorMdc(NO_FM_SRC, '无 frontmatter');
  assert.ok(out.startsWith('---\ndescription: 无 frontmatter\nalwaysApply: true\n---\n'));
  assert.ok(out.includes('# 无 frontmatter'));
});

test('buildCodexBlock：含 BEGIN/END 标记与标题，剥 frontmatter', () => {
  const block = buildCodexBlock([{ name: 'a.md', srcText: FM_SRC }]);
  assert.ok(block.includes('<!-- BEGIN rule: a.md -->'));
  assert.ok(block.includes('<!-- END rule: a.md -->'));
  assert.ok(block.includes('## a'));
  assert.ok(!block.includes('description: 旧描述')); // frontmatter 剥掉
});

test('mergeAgentsMd：追加保留原内容', () => {
  const existing = '# AGENTS.md\n\n用户原有内容\n';
  const block = buildCodexBlock([{ name: 'a.md', srcText: NO_FM_SRC }]);
  const out = mergeAgentsMd(existing, block);
  assert.ok(out.includes('用户原有内容'));
  assert.ok(out.includes('<!-- BEGIN rule: a.md -->'));
});

test('mergeAgentsMd：同名块幂等替换不重复', () => {
  const block = buildCodexBlock([{ name: 'a.md', srcText: NO_FM_SRC }]);
  const once = mergeAgentsMd('', block);
  const twice = mergeAgentsMd(once, block);
  const count = (twice.match(/<!-- BEGIN rule: a.md -->/g) || []).length;
  assert.strictEqual(count, 1);
});

test('applyConfig claude：.claude/rules/*.md 原样 + .claude/skills 无 .DS_Store', () => {
  const dir = mkTmp();
  applyConfig({
    projectDir: dir,
    targets: ['claude'],
    ruleNames: ['android-webview-5.md'],
    skillNames: ['chances-sdk-v2'],
    rulesSrcDir: RULES_DIR,
    skillsSrcDir: SKILLS_DIR,
    overwrite: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.claude/rules/android-webview-5.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/chances-sdk-v2/SKILL.md')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude/skills/chances-sdk-v2/.DS_Store')));
});

test('applyConfig cursor：.cursor/rules/*.mdc + .agents/skills', () => {
  const dir = mkTmp();
  applyConfig({
    projectDir: dir,
    targets: ['cursor'],
    ruleNames: ['android-webview-5.md'],
    skillNames: ['chances-sdk-v2'],
    rulesSrcDir: RULES_DIR,
    skillsSrcDir: SKILLS_DIR,
    overwrite: true,
  });
  const mdc = path.join(dir, '.cursor/rules/android-webview-5.mdc');
  assert.ok(fs.existsSync(mdc));
  assert.ok(fs.readFileSync(mdc, 'utf8').includes('alwaysApply: true'));
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/chances-sdk-v2/SKILL.md')));
});

test('applyConfig codex：根 AGENTS.md 拼接块 + .agents/skills', () => {
  const dir = mkTmp();
  applyConfig({
    projectDir: dir,
    targets: ['codex'],
    ruleNames: ['android-webview-5.md'],
    skillNames: ['chances-sdk-v2'],
    rulesSrcDir: RULES_DIR,
    skillsSrcDir: SKILLS_DIR,
    overwrite: true,
  });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(agents.includes('<!-- BEGIN rule: android-webview-5.md -->'));
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/chances-sdk-v2/SKILL.md')));
});

test('applyConfig claude+cursor：skills 两处各一份', () => {
  const dir = mkTmp();
  applyConfig({
    projectDir: dir,
    targets: ['claude', 'cursor'],
    ruleNames: [],
    skillNames: ['chances-sdk-v2'],
    rulesSrcDir: RULES_DIR,
    skillsSrcDir: SKILLS_DIR,
    overwrite: true,
  });
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/chances-sdk-v2/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/chances-sdk-v2/SKILL.md')));
});

test('applyConfig overwrite=false：跳过已存在文件', () => {
  const dir = mkTmp();
  const out = path.join(dir, '.claude/rules/android-webview-5.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, '用户自定义内容');
  applyConfig({
    projectDir: dir,
    targets: ['claude'],
    ruleNames: ['android-webview-5.md'],
    skillNames: [],
    rulesSrcDir: RULES_DIR,
    skillsSrcDir: SKILLS_DIR,
    overwrite: false,
  });
  assert.strictEqual(fs.readFileSync(out, 'utf8'), '用户自定义内容');
});

test('applyConfig：未知平台报错', () => {
  const dir = mkTmp();
  assert.throws(
    () =>
      applyConfig({
        projectDir: dir,
        targets: ['nope'],
        ruleNames: [],
        skillNames: [],
        rulesSrcDir: RULES_DIR,
        skillsSrcDir: SKILLS_DIR,
        overwrite: true,
      }),
    /未知平台/,
  );
});

test('applyConfig：非法规则名报错', () => {
  const dir = mkTmp();
  assert.throws(
    () =>
      applyConfig({
        projectDir: dir,
        targets: ['claude'],
        ruleNames: ['../etc/passwd'],
        skillNames: [],
        rulesSrcDir: RULES_DIR,
        skillsSrcDir: SKILLS_DIR,
        overwrite: true,
      }),
    /非法/,
  );
});
