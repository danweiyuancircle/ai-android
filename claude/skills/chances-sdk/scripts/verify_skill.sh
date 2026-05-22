#!/usr/bin/env bash
# chances-sdk skill 漂移校验。
#
# 机械比对 skill 里声明的「模块坐标版本 / 锁定库版本 / 入口类」与 BaseComponent 源码的实际值，
# 发现漂移即报错(退出码 1)。**仅在 BaseComponent 源码仓库运行**(依赖源码 grep)；下游主工程无源码，跑不了。
# 用法: bash .claude/skills/chances-sdk/scripts/verify_skill.sh
#
# 注意:本脚本只能抓「版本号 / 类名」这类字符串级漂移,抓不了方法签名 / Config 字段默认值的语义漂移——
# 后者由 /check-chances-sdk-skill 命令里的语义抽查补。
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SKILL="$REPO_ROOT/.claude/skills/chances-sdk/SKILL.md"
CONFIG="$REPO_ROOT/config.gradle"
SRC_DIRS=(core tvms wslog player_ijk iptv2ex)

fail=0
pass() { echo "  ✓ $1"; }
err()  { echo "  ✗ $1"; fail=1; }

src_paths=()
for d in "${SRC_DIRS[@]}"; do src_paths+=("$REPO_ROOT/$d"); done

echo "[1] 模块发布坐标版本号  build.gradle ↔ SKILL.md 坐标表"
check_mod() { # $1=模块目录 $2=artifactId
  local v
  v=$(grep -hoE 'libVersionName[[:space:]]*=[[:space:]]*"[^"]+"' "$REPO_ROOT/$1/build.gradle" 2>/dev/null \
        | head -1 | grep -oE '"[^"]+"' | tr -d '"')
  if [ -z "$v" ]; then err "$1: 未读到 libVersionName"; return; fi
  if grep -F "com.chances.sdk:$2\`" "$SKILL" | grep -qF "$v"; then
    pass "$2 = $v"
  else
    err "$2 源码版本 $v 未在 SKILL.md 坐标表体现(改 SKILL.md 坐标表 + 顶部「适用版本」)"
  fi
}
check_mod core core
check_mod core_compiler core-compiler
check_mod tvms tvms
check_mod wslog wslog
check_mod player_ijk player-ijk
check_mod iptv2ex iptv2ex

echo "[2] 锁定第三方库版本  config.gradle ↔ SKILL.md 版本表"
check_ver() { # $1=标签 $2=版本号
  if [ -z "$2" ]; then err "$1: 未从 config.gradle 读到版本"; return; fi
  if grep -qF "$2" "$SKILL"; then pass "$1 $2"; else err "$1 $2 不在 SKILL.md 版本表"; fi
}
val_in_quotes() { grep -oE "$1[[:space:]]*=[[:space:]]*\"[^\"]+\"" "$CONFIG" | head -1 | grep -oE '"[^"]+"' | tr -d '"'; }
val_after_colon() { grep -oE "$1:[0-9][0-9.]+" "$CONFIG" | head -1 | sed -E "s/^$1://"; }
check_ver okhttp      "$(val_in_quotes okHttpVersion)"
check_ver retrofit    "$(val_in_quotes retrofitVersion)"
check_ver glide       "$(val_in_quotes glideVersion)"
check_ver support     "$(grep -oE 'supportVersion[[:space:]]*:[[:space:]]*"[^"]+"' "$CONFIG" | head -1 | grep -oE '"[^"]+"' | tr -d '"')"
check_ver rxjava      "$(val_after_colon rxjava)"
check_ver arouter-api "$(val_after_colon arouter-api)"
check_ver eventbus    "$(val_after_colon eventbus)"
check_ver tinker      "$(val_after_colon tinker-android-lib)"
check_ver butterknife "$(val_after_colon butterknife)"
check_ver gson        "$(val_after_colon gson)"

echo "[3] 入口类存在性  SKILL/references 引用的入口 ↔ 源码"
check_sym() {
  if grep -rqsl --include="*.java" --include="*.kt" --exclude-dir=build "$1" "${src_paths[@]}"; then
    pass "$1"
  else
    err "$1 在源码中找不到——skill 可能引用了已删除/改名的入口,需更新对应 references"
  fi
}
for s in SdkCore WsLogManager TvmsManager TvmsServerApi PermissionHelper IjkFactory \
         IPTV2ExtendsManager UniversalVideoView HttpClientManager SdkErrorCodeRegistry \
         HttpStaticalCache NativeFactory; do
  check_sym "$s"
done

echo "[4] 反例守卫  Tvms.init / Ijk.init 门面应仍不存在(skill 把它们写成「不要调用」)"
if grep -rqs --include="*.java" --include="*.kt" --exclude-dir=build -E "(class|object|interface)[[:space:]]+Tvms[[:space:]]" "$REPO_ROOT/tvms"; then
  err "tvms 新增了顶层 Tvms 类——若它提供了 Tvms.init 入口,请把 skill 的反例提醒改为推荐写法"
else
  pass "无 Tvms 门面(与 skill 一致)"
fi
if grep -rqs --include="*.java" --include="*.kt" --exclude-dir=build -E "(class|object|interface)[[:space:]]+Ijk[[:space:]]" "$REPO_ROOT/player_ijk"; then
  err "player_ijk 新增了顶层 Ijk 类——若它提供了 Ijk.init 入口,请把 skill 的反例提醒改为推荐写法"
else
  pass "无 Ijk 门面(与 skill 一致)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✅ chances-sdk skill 与源码一致(字符串级)"
else
  echo "❌ 发现漂移,按上面 ✗ 提示更新 skill,并同步 SKILL.md §版本差异"
fi
exit "$fail"
