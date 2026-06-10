/**
 * 把选中的 rules / skills 落地到生成工程，按 AI 平台格式转换。
 *
 * 纯字符串变换（toCursorMdc / buildCodexBlock / mergeAgentsMd）单独导出便于测试；
 * writer 编排纯函数 + fs。风格对齐 lib/voiceConfig.js。
 */
const fs = require('node:fs');
const path = require('node:path');
const { copyTree, DEFAULT_EXCLUDES } = require('./copyTree');
const { splitFrontmatter, extractDescription, isSafeRuleName, isSafeSkillName } = require('./rulesCatalog');

// skills 整目录拷贝额外排除 .DS_Store（源 chances-sdk/ 含此脏文件）。
const SKILL_EXCLUDES = {
  ...DEFAULT_EXCLUDES,
  names: ['.DS_Store', ...DEFAULT_EXCLUDES.names],
};

/** 二次防穿越：名字须是纯 basename，且 realpath 落在源目录内。 */
function assertSafe(name, srcDir) {
  if (path.basename(name) !== name) {
    throw new Error(`非法名称（路径穿越）：${name}`);
  }
  const real = fs.realpathSync(path.join(srcDir, name));
  const root = fs.realpathSync(srcDir);
  if (real !== root && !real.startsWith(root + path.sep)) {
    throw new Error(`非法名称（越出源目录）：${name}`);
  }
}

/** 纯函数：源 rule 文本 → Cursor .mdc（剥原 frontmatter，注入 description + alwaysApply）。 */
function toCursorMdc(srcText, description) {
  const { body } = splitFrontmatter(srcText);
  const desc = description.replace(/\r?\n/g, ' ').trim();
  const fm = ['---', `description: ${desc}`, 'alwaysApply: true', '---'].join('\n');
  return `${fm}\n\n${body.replace(/^\r?\n+/, '')}`;
}

/** 纯函数：多条 rule → Codex AGENTS.md 追加块（剥 frontmatter，带 BEGIN/END 标记）。 */
function buildCodexBlock(items) {
  return items
    .map(({ name, srcText }) => {
      const { body } = splitFrontmatter(srcText);
      const heading = name.replace(/\.md$/, '');
      return `<!-- BEGIN rule: ${name} -->\n## ${heading}\n\n${body.trim()}\n<!-- END rule: ${name} -->`;
    })
    .join('\n\n');
}

/**
 * 纯函数：把 block 合并进已有 AGENTS.md。
 * 按 BEGIN/END 标记删除同名旧块后再追加（幂等），绝不整文件覆盖。
 */
function mergeAgentsMd(existing, block) {
  const names = [...block.matchAll(/<!-- BEGIN rule: (.+?) -->/g)].map((m) => m[1]);
  let base = existing || '';
  for (const n of names) {
    const re = new RegExp(`\\n*<!-- BEGIN rule: ${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->[\\s\\S]*?<!-- END rule: ${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->\\n*`, 'g');
    base = base.replace(re, '\n');
  }
  base = base.replace(/\s*$/, '');
  const head = base ? `${base}\n\n` : '# AGENTS.md\n\n';
  return `${head}${block}\n`;
}

/** Claude Code：原样拷 .md 到 .claude/rules/（保留 frontmatter 的 paths/description）。 */
function writeClaudeRules({ projectDir, ruleNames, rulesSrcDir, overwrite }) {
  const dest = path.join(projectDir, '.claude', 'rules');
  fs.mkdirSync(dest, { recursive: true });
  for (const n of ruleNames) {
    assertSafe(n, rulesSrcDir);
    const out = path.join(dest, n);
    if (fs.existsSync(out) && !overwrite) {
      continue;
    }
    fs.copyFileSync(path.join(rulesSrcDir, n), out);
  }
}

/** Cursor：.md → .mdc，注入 frontmatter，写 .cursor/rules/。 */
function writeCursorRules({ projectDir, ruleNames, rulesSrcDir, overwrite }) {
  const dest = path.join(projectDir, '.cursor', 'rules');
  fs.mkdirSync(dest, { recursive: true });
  for (const n of ruleNames) {
    assertSafe(n, rulesSrcDir);
    const out = path.join(dest, n.replace(/\.md$/, '.mdc'));
    if (fs.existsSync(out) && !overwrite) {
      continue;
    }
    const src = fs.readFileSync(path.join(rulesSrcDir, n), 'utf8');
    const desc = extractDescription(src, n.replace(/\.md$/, ''));
    fs.writeFileSync(out, toCursorMdc(src, desc));
  }
}

/** Codex：拼接进工程根 AGENTS.md（追加/按标记替换，不整文件覆盖）。 */
function writeCodexRules({ projectDir, ruleNames, rulesSrcDir }) {
  if (!ruleNames.length) {
    return;
  }
  const items = ruleNames.map((n) => {
    assertSafe(n, rulesSrcDir);
    return { name: n, srcText: fs.readFileSync(path.join(rulesSrcDir, n), 'utf8') };
  });
  const file = path.join(projectDir, 'AGENTS.md');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  fs.writeFileSync(file, mergeAgentsMd(existing, buildCodexBlock(items)));
}

/** skills 整目录拷贝到指定平台目录（排除 .DS_Store）。 */
function writeSkills({ projectDir, skillNames, skillsSrcDir, skillsDest, overwrite }) {
  for (const s of skillNames) {
    assertSafe(s, skillsSrcDir);
    const out = path.join(projectDir, skillsDest, s);
    if (fs.existsSync(out)) {
      if (!overwrite) {
        continue;
      }
      fs.rmSync(out, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    copyTree(path.join(skillsSrcDir, s), out, SKILL_EXCLUDES);
  }
}

/**
 * 平台元数据。rulesDest/skillsDest 为相对工程根的展示路径；writeRules 为对应 rules writer。
 * skills 目标由平台决定：Claude 只认 .claude/skills/，Cursor/Codex 用 .agents/skills/。
 */
const TARGETS = {
  claude: { label: 'Claude Code', rulesDest: '.claude/rules', skillsDest: '.claude/skills', writeRules: writeClaudeRules },
  cursor: { label: 'Cursor', rulesDest: '.cursor/rules', skillsDest: '.agents/skills', writeRules: writeCursorRules },
  codex: { label: 'Codex', rulesDest: 'AGENTS.md', skillsDest: '.agents/skills', writeRules: writeCodexRules },
};

/**
 * 把一次选择落地到所有选中平台。
 * @return [{ target, label, rulesDest, skillsDest }] 落地摘要
 */
function applyConfig({ projectDir, targets, ruleNames, skillNames, rulesSrcDir, skillsSrcDir, overwrite }) {
  for (const n of ruleNames) {
    if (!isSafeRuleName(n)) {
      throw new Error(`未知或非法规则名：${n}`);
    }
  }
  for (const s of skillNames) {
    if (!isSafeSkillName(s)) {
      throw new Error(`未知或非法 skill 名：${s}`);
    }
  }
  const summary = [];
  for (const t of targets) {
    const meta = TARGETS[t];
    if (!meta) {
      throw new Error(`未知平台「${t}」，可选 ${Object.keys(TARGETS).join('|')}`);
    }
    meta.writeRules({ projectDir, ruleNames, rulesSrcDir, overwrite });
    writeSkills({ projectDir, skillNames, skillsSrcDir, skillsDest: meta.skillsDest, overwrite });
    summary.push({ target: t, label: meta.label, rulesDest: meta.rulesDest, skillsDest: meta.skillsDest });
  }
  return summary;
}

module.exports = {
  TARGETS,
  applyConfig,
  writeSkills,
  toCursorMdc,
  buildCodexBlock,
  mergeAgentsMd,
};
