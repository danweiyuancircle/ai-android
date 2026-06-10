/**
 * rules / skills 源目录扫描与纯字符串工具。
 *
 * 源定位仿 index.js 的 BUNDLED_TEMPLATE 回退：发布包内 cli/rules、cli/skills（prepack 拷入），
 * 仓库内（npm link）回退 ../claude/rules、../claude/skills。
 */
const fs = require('node:fs');
const path = require('node:path');

/** kind: 'rules' | 'skills'。先看发布包内 cli/<kind>，回退仓库 ../claude/<kind>。 */
function resolveSource(kind) {
  const bundled = path.join(__dirname, '..', kind);
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return path.join(__dirname, '..', '..', 'claude', kind);
}

const RULES_DIR = resolveSource('rules');
const SKILLS_DIR = resolveSource('skills');

// rule 仅扁平 .md 文件名；skill 仅单段目录名。防路径穿越与隐藏文件。
const RULE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isSafeRuleName(n) {
  return typeof n === 'string' && RULE_NAME_RE.test(n) && !n.includes('..') && !n.includes('/');
}

function isSafeSkillName(n) {
  return typeof n === 'string' && SKILL_NAME_RE.test(n) && !n.includes('..') && !n.includes('/');
}

/** 列出源目录下全部安全 .md 规则名（排序）。 */
function listRules() {
  return fs
    .readdirSync(RULES_DIR)
    .filter((n) => n.endsWith('.md') && isSafeRuleName(n))
    .sort();
}

/** 列出源目录下含 SKILL.md 的安全 skill 目录名（排序）。 */
function listSkills() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        isSafeSkillName(e.name) &&
        fs.existsSync(path.join(SKILLS_DIR, e.name, 'SKILL.md')),
    )
    .map((e) => e.name)
    .sort();
}

/**
 * 剥首块 frontmatter。
 * @return { frontmatter: string|null, body: string }
 */
function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    return { frontmatter: null, body: text };
  }
  return { frontmatter: m[1], body: text.slice(m[0].length) };
}

/**
 * 抽取 Cursor 用 description：
 * 优先取源 frontmatter 的 `description:` 行 → 否则 body 首个 markdown 标题 → 否则 fallback。
 */
function extractDescription(text, fallback) {
  const { frontmatter, body } = splitFrontmatter(text);
  if (frontmatter) {
    const m = frontmatter.match(/^description:\s*(.+?)\s*$/m);
    if (m) {
      return m[1].trim();
    }
  }
  const h = body.match(/^#{1,6}\s+(.+?)\s*$/m);
  return (h && h[1].trim()) || fallback;
}

module.exports = {
  RULES_DIR,
  SKILLS_DIR,
  listRules,
  listSkills,
  splitFrontmatter,
  extractDescription,
  isSafeRuleName,
  isSafeSkillName,
};
