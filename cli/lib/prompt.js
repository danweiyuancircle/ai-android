/**
 * @clack/prompts 薄封装层。
 *
 * @clack 是 ESM-only（type:module，仅 .mjs），本包是 CJS，故用动态 import 跨越；
 * ESM 有 module 缓存，配合局部 _p 缓存，整进程只解析一次。无 default export，全部具名取用。
 *
 * 取消处理统一收敛在 bail()：Ctrl+C / ESC 命中 cancel symbol → 优雅退出（码 0，非错误）。
 * 注意：@clack 面向 TTY，调用方必须仅在 interactive 分支调用本模块。
 */
'use strict';

let _p;
async function clack() {
  if (!_p) {
    _p = await import('@clack/prompts');
  }
  return _p;
}

/** 取消即正常退出（码 0），区别于 main().catch 的错误退出（码 1）。 */
function bail(p, value) {
  if (p.isCancel(value)) {
    p.cancel('已取消');
    process.exit(0);
  }
  return value;
}

async function intro(msg) {
  (await clack()).intro(msg);
}

async function outro(msg) {
  (await clack()).outro(msg);
}

/** 摘要块（message, title），带边框，仅交互态用。 */
async function note(message, title) {
  (await clack()).note(message, title);
}

/** 步骤日志（log.step），用于分步骤进度感。 */
async function logStep(msg) {
  (await clack()).log.step(msg);
}

/** 进度反馈：透传 @clack spinner（{ start, stop, message }）。 */
async function spinner() {
  return (await clack()).spinner();
}

/**
 * 文本输入。defaultValue 实现「回车留空取默认」；required 时挂非空 validate。
 * @param {{message:string, placeholder?:string, defaultValue?:string, required?:boolean}} o
 * @return {Promise<string>}
 */
async function askText(o) {
  const p = await clack();
  const v = await p.text({
    message: o.message,
    placeholder: o.placeholder,
    defaultValue: o.defaultValue,
    validate: o.required ? (val) => (val && val.trim() ? undefined : '此项必填') : undefined,
  });
  return bail(p, v);
}

/** 密钥输入（可留空，不挂 validate）。 */
async function askPassword(message) {
  const p = await clack();
  const v = await p.password({ message });
  return bail(p, v);
}

/**
 * 单选。
 * @param {{message:string, options:Array<{value,label?,hint?}>, initialValue?}} o
 */
async function askSelect(o) {
  const p = await clack();
  const v = await p.select({ message: o.message, options: o.options, initialValue: o.initialValue });
  return bail(p, v);
}

/**
 * 多选。默认勾选用 initialValues；required:false 允许空选。
 * @param {{message:string, options:Array<{value,label?,hint?}>, initialValues?:any[]}} o
 * @return {Promise<any[]>}
 */
async function askMultiSelect(o) {
  const p = await clack();
  const v = await p.multiselect({
    message: o.message,
    options: o.options,
    initialValues: o.initialValues,
    required: false,
  });
  return bail(p, v);
}

module.exports = { intro, outro, note, logStep, spinner, askText, askPassword, askSelect, askMultiSelect };
