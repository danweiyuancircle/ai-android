<template>
  <EPage id="list-detail-test" default-focus="ld-back" class="page list-detail-test">
    <!-- 头部 -->
    <div class="ld-header">
      <EButton focus-key="ld-back" label="← 返回" size="sm" @enter="goBack" />
      <h1 class="ld-title">列表详情测试页</h1>
    </div>

    <!-- 主体：左列表 + 右详情 -->
    <div class="ld-body">
      <!-- ====== 左侧列表 ====== -->
      <div class="ld-sidebar">
        <div class="ld-list-title">样式列表</div>
        <div
          v-for="(item, idx) in items"
          :key="item.key"
          class="ld-list-item"
          :class="{ active: activeKey === item.key }"
        >
          <EFocusable
            :focus-key="`ld-item-${idx}`"
            v-slot="{ focused }"
            @enter="selectItem(item.key)"
          >
            <div class="ld-item-inner" :class="{ focused }">
              <span class="ld-item-icon">{{ item.icon }}</span>
              <div class="ld-item-text">
                <div class="ld-item-name">{{ item.name }}</div>
                <div class="ld-item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </EFocusable>
        </div>
      </div>

      <!-- ====== 右侧详情区 ====== -->
      <div class="ld-detail">
        <!-- 样式一：卡片信息 -->
        <section v-if="activeKey === 'card'" class="ld-section">
          <div class="ld-section-title">📇 卡片信息样式</div>
          <div class="demo-card-grid">
            <div v-for="i in 4" :key="i" class="demo-card">
              <EFocusable :focus-key="`ld-card-${i}`" v-slot="{ focused }">
                <div class="demo-card-inner" :class="{ focused }">
                  <div class="demo-card-avatar">{{ ['🐶','🐱','🐼','🦊'][i-1] }}</div>
                  <div class="demo-card-name">{{ ['小黄','小白','胖达','小狐'][i-1] }}</div>
                  <div class="demo-card-tag">{{ ['金毛','布偶','熊猫','赤狐'][i-1] }}</div>
                </div>
              </EFocusable>
            </div>
          </div>
        </section>

        <!-- 样式二：时间线 -->
        <section v-if="activeKey === 'timeline'" class="ld-section">
          <div class="ld-section-title">⏳ 时间线样式</div>
          <div class="demo-timeline">
            <div v-for="(ev, i) in events" :key="i" class="demo-tl-item">
              <EFocusable :focus-key="`ld-tl-${i}`" v-slot="{ focused }">
                <div class="demo-tl-inner" :class="{ focused }">
                  <div class="demo-tl-dot" :class="ev.color"></div>
                  <div class="demo-tl-body">
                    <div class="demo-tl-time">{{ ev.time }}</div>
                    <div class="demo-tl-title">{{ ev.title }}</div>
                    <div class="demo-tl-desc">{{ ev.desc }}</div>
                  </div>
                </div>
              </EFocusable>
            </div>
          </div>
        </section>

        <!-- 样式三：数据统计 -->
        <section v-if="activeKey === 'stats'" class="ld-section">
          <div class="ld-section-title">📊 数据统计样式</div>
          <div class="demo-stats">
            <div class="demo-stats-row">
              <div v-for="s in statsTop" :key="s.label" class="demo-stat-card">
                <EFocusable :focus-key="`ld-st-${s.label}`" v-slot="{ focused }">
                  <div class="demo-stat-inner" :class="{ focused }">
                    <div class="demo-stat-value" :style="{ color: s.color }">{{ s.value }}</div>
                    <div class="demo-stat-label">{{ s.label }}</div>
                    <div class="demo-stat-change" :class="s.up ? 'up' : 'down'">
                      {{ s.up ? '↑' : '↓' }} {{ s.change }}
                    </div>
                  </div>
                </EFocusable>
              </div>
            </div>
            <div class="demo-stats-bar">
              <div class="demo-bar-label">月度趋势</div>
              <div class="demo-bar-track">
                <div
                  v-for="(b, i) in barData" :key="i"
                  class="demo-bar-col"
                  :style="{ height: b.pct + '%' }"
                >
                  <EFocusable :focus-key="`ld-bar-${i}`" v-slot="{ focused }">
                    <div class="demo-bar-fill" :class="{ focused }" :style="{ height: '100%' }"></div>
                  </EFocusable>
                </div>
              </div>
              <div class="demo-bar-labels">
                <span v-for="(b, i) in barData" :key="i">{{ b.label }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 样式四：列表表格 -->
        <section v-if="activeKey === 'table'" class="ld-section">
          <div class="ld-section-title">📋 表格列表样式</div>
          <div class="demo-table">
            <div class="demo-table-header">
              <span class="col-rank">#</span>
              <span class="col-name">名称</span>
              <span class="col-type">类型</span>
              <span class="col-status">状态</span>
              <span class="col-action">操作</span>
            </div>
            <div v-for="(row, i) in tableData" :key="i" class="demo-table-row">
              <EFocusable :focus-key="`ld-tbl-${i}`" v-slot="{ focused }">
                <div class="demo-table-inner" :class="{ focused }">
                  <span class="col-rank">{{ i + 1 }}</span>
                  <span class="col-name">{{ row.name }}</span>
                  <span class="col-type">{{ row.type }}</span>
                  <span class="col-status">
                    <span class="status-badge" :class="row.status">{{ row.statusLabel }}</span>
                  </span>
                  <span class="col-action">
                    <span class="action-btn">查看</span>
                  </span>
                </div>
              </EFocusable>
            </div>
          </div>
        </section>

        <!-- 样式五：媒体画廊 -->
        <section v-if="activeKey === 'media'" class="ld-section">
          <div class="ld-section-title">🎬 媒体画廊样式</div>
          <div class="demo-media">
            <div class="demo-media-main">
              <EFocusable focus-key="ld-media-main" v-slot="{ focused }">
                <div class="demo-media-player" :class="{ focused }">
                  <span class="demo-media-play-icon">▶</span>
                  <div class="demo-media-cover">
                    <span class="demo-media-cover-text">精选视频</span>
                  </div>
                </div>
              </EFocusable>
            </div>
            <div class="demo-media-thumbs">
              <div v-for="(m, i) in mediaList" :key="i" class="demo-media-thumb">
                <EFocusable :focus-key="`ld-media-${i}`" v-slot="{ focused }">
                  <div class="demo-media-thumb-inner" :class="{ focused }">
                    <div class="demo-media-thumb-img">{{ m.icon }}</div>
                    <div class="demo-media-thumb-label">{{ m.label }}</div>
                  </div>
                </EFocusable>
              </div>
            </div>
          </div>
        </section>

        <!-- 空状态 -->
        <div v-if="!activeKey" class="ld-empty">
          <div class="ld-empty-icon">👈</div>
          <div class="ld-empty-text">从左侧选择一个样式查看</div>
        </div>
      </div>
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { EPage, EButton, EFocusable } from '@chancestv/tv-ui'

const router = useRouter()
const goBack = () => router.back()

const activeKey = ref('')

const items = [
  { key: 'card',     icon: '📇', name: '卡片信息',     desc: '用户卡片网格布局' },
  { key: 'timeline', icon: '⏳', name: '时间线',       desc: '纵向时间轴事件流' },
  { key: 'stats',    icon: '📊', name: '数据统计',     desc: '指标卡片 + 柱状图' },
  { key: 'table',    icon: '📋', name: '表格列表',     desc: '带状态标签的数据表' },
  { key: 'media',    icon: '🎬', name: '媒体画廊',     desc: '视频播放 + 缩略图' },
]

const selectItem = (key: string) => {
  activeKey.value = key
}

// 时间线数据
const events = [
  { time: '09:00', title: '晨会',     desc: '团队同步进度',     color: 'blue' },
  { time: '10:30', title: '代码评审',  desc: 'PR #142 审查',     color: 'green' },
  { time: '12:00', title: '午餐',     desc: '楼下餐厅',         color: 'orange' },
  { time: '14:00', title: '需求评审',  desc: '新功能方案对齐',   color: 'purple' },
  { time: '16:30', title: '技术分享',  desc: '微服务架构演进',   color: 'cyan' },
]

// 统计数据
const statsTop = [
  { label: '用户数', value: '12.8K', color: '#4af', change: '8.2%', up: true },
  { label: '营收',   value: '¥86.4K', color: '#4f6', change: '12.5%', up: true },
  { label: '订单',   value: '1,892', color: '#fa4', change: '3.1%', up: false },
  { label: '转化率', value: '3.24%', color: '#a7f', change: '0.6%', up: true },
]

const barData = [
  { label: '1月', pct: 45 },
  { label: '2月', pct: 52 },
  { label: '3月', pct: 68 },
  { label: '4月', pct: 74 },
  { label: '5月', pct: 61 },
  { label: '6月', pct: 88 },
  { label: '7月', pct: 95 },
]

// 表格数据
const tableData = [
  { name: '智能音箱 Pro',   type: '硬件', status: 'online',  statusLabel: '在线' },
  { name: '语音助手服务',   type: '服务', status: 'online',  statusLabel: '在线' },
  { name: '数据同步任务',   type: '任务', status: 'running', statusLabel: '运行中' },
  { name: '日志采集器',     type: '服务', status: 'offline', statusLabel: '离线' },
  { name: '模型训练作业',   type: '任务', status: 'running', statusLabel: '运行中' },
  { name: 'API 网关',       type: '服务', status: 'online',  statusLabel: '在线' },
]

// 媒体数据
const mediaList = [
  { icon: '🌄', label: '风景' },
  { icon: '🎵', label: '音乐' },
  { icon: '🎮', label: '游戏' },
  { icon: '📺', label: '剧集' },
  { icon: '📚', label: '教程' },
  { icon: '🏀', label: '体育' },
]
</script>

<style scoped>
/* ===== 页面布局 ===== */
.list-detail-test {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 40px;
  color: #e0e4ec;
}

.ld-header {
  display: flex;
  align-items: center;
  padding: 20px 0;
  gap: 20px;
  flex-shrink: 0;
}

.ld-title {
  font-size: 30px;
  color: #fff;
  margin: 0;
}

.ld-body {
  display: flex;
  flex: 1;
  gap: 24px;
  min-height: 0;
  padding-bottom: 20px;
}

/* ===== 左侧列表 ===== */
.ld-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #1a1e26;
  border-radius: 14px;
  padding: 16px;
  overflow-y: auto;
}

.ld-list-title {
  font-size: 18px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 8px 12px 16px;
}

.ld-list-item {
  margin-bottom: 6px;
}

.ld-list-item.active .ld-item-inner {
  background: rgba(68, 170, 255, 0.15);
  border-color: rgba(68, 170, 255, 0.3);
}

.ld-item-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ld-item-inner.focused {
  background: rgba(68, 170, 255, 0.2);
  border-color: #4af;
  transform: translateX(4px);
}

.ld-item-icon {
  font-size: 26px;
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.ld-item-text {
  flex: 1;
  min-width: 0;
}

.ld-item-name {
  font-size: 18px;
  color: #fff;
  font-weight: 500;
}

.ld-item-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
}

/* ===== 右侧详情区 ===== */
.ld-detail {
  flex: 1;
  background: #1a1e26;
  border-radius: 14px;
  padding: 28px 32px;
  overflow-y: auto;
  min-width: 0;
}

.ld-section {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ld-section-title {
  font-size: 22px;
  color: #fff;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.ld-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.4;
}

.ld-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.ld-empty-text {
  font-size: 18px;
}

/* ===== 样式一：卡片信息 ===== */
.demo-card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.demo-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #242832;
  border-radius: 14px;
  border: 3px solid transparent;
  transition: all 0.15s ease;
}

.demo-card-inner.focused {
  border-color: #4af;
  background: #2a3a50;
  transform: scale(1.05);
}

.demo-card-avatar {
  font-size: 44px;
  margin-bottom: 10px;
}

.demo-card-name {
  font-size: 20px;
  color: #fff;
  font-weight: 500;
}

.demo-card-tag {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin-top: 4px;
}

/* ===== 样式二：时间线 ===== */
.demo-timeline {
  padding-left: 20px;
  border-left: 2px solid rgba(255,255,255,0.1);
}

.demo-tl-item {
  margin-bottom: 16px;
}

.demo-tl-inner {
  display: flex;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.15s ease;
  position: relative;
}

.demo-tl-inner.focused {
  background: rgba(68, 170, 255, 0.12);
  border-color: #4af;
}

.demo-tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
  position: relative;
  left: -27px;
  background: #4af;
  box-shadow: 0 0 6px rgba(68,170,255,0.5);
}

.demo-tl-dot.blue   { background: #4af;   box-shadow: 0 0 6px rgba(68,170,255,0.5); }
.demo-tl-dot.green  { background: #4f6;   box-shadow: 0 0 6px rgba(68,255,102,0.5); }
.demo-tl-dot.orange { background: #fa4;   box-shadow: 0 0 6px rgba(255,170,68,0.5); }
.demo-tl-dot.purple { background: #a7f;   box-shadow: 0 0 6px rgba(170,119,255,0.5); }
.demo-tl-dot.cyan   { background: #4df;   box-shadow: 0 0 6px rgba(68,221,255,0.5); }

.demo-tl-body {
  flex: 1;
}

.demo-tl-time {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  font-family: monospace;
}

.demo-tl-title {
  font-size: 18px;
  color: #fff;
  font-weight: 500;
  margin-top: 2px;
}

.demo-tl-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  margin-top: 4px;
}

/* ===== 样式三：数据统计 ===== */
.demo-stats {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.demo-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.demo-stat-inner {
  padding: 20px 18px;
  background: #242832;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.demo-stat-inner.focused {
  border-color: #4af;
  background: #2a3a50;
  transform: translateY(-3px);
}

.demo-stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: monospace;
}

.demo-stat-label {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin-top: 6px;
}

.demo-stat-change {
  font-size: 13px;
  margin-top: 4px;
  font-weight: 500;
}

.demo-stat-change.up   { color: #4f6; }
.demo-stat-change.down { color: #f66; }

/* 柱状图 */
.demo-stats-bar {
  background: #242832;
  border-radius: 12px;
  padding: 20px 24px;
}

.demo-bar-label {
  font-size: 16px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 16px;
}

.demo-bar-track {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 140px;
}

.demo-bar-col {
  flex: 1;
  border-radius: 6px 6px 0 0;
  background: rgba(68, 170, 255, 0.15);
  position: relative;
  transition: height 0.3s ease;
}

.demo-bar-fill {
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #4af, #2a6faf);
  transition: all 0.15s ease;
}

.demo-bar-fill.focused {
  background: linear-gradient(180deg, #6cf, #4af);
  box-shadow: 0 0 12px rgba(68,170,255,0.5);
}

.demo-bar-labels {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.demo-bar-labels span {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

/* ===== 样式四：表格列表 ===== */
.demo-table {
  display: flex;
  flex-direction: column;
}

.demo-table-header {
  display: flex;
  padding: 10px 16px;
  font-size: 13px;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.demo-table-row {
  margin-bottom: 4px;
}

.demo-table-inner {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.demo-table-inner.focused {
  background: rgba(68, 170, 255, 0.1);
  border-color: #4af;
}

.col-rank { width: 40px; flex-shrink: 0; color: rgba(255,255,255,0.3); }
.col-name { flex: 2; color: #fff; font-weight: 500; }
.col-type { flex: 1; color: rgba(255,255,255,0.5); }
.col-status { flex: 1; }
.col-action { width: 60px; text-align: right; }

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.online  { background: rgba(68,255,102,0.15); color: #4f6; }
.status-badge.offline { background: rgba(255,68,68,0.15);  color: #f66; }
.status-badge.running { background: rgba(68,170,255,0.15); color: #4af; }

.action-btn {
  font-size: 13px;
  color: #4af;
  cursor: pointer;
}

/* ===== 样式五：媒体画廊 ===== */
.demo-media {
  display: flex;
  gap: 20px;
}

.demo-media-main {
  flex: 1;
  min-width: 0;
}

.demo-media-player {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #242832;
  border-radius: 14px;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.15s ease;
}

.demo-media-player.focused {
  border-color: #4af;
  box-shadow: 0 0 20px rgba(68,170,255,0.3);
}

.demo-media-play-icon {
  position: absolute;
  font-size: 48px;
  color: #fff;
  opacity: 0.8;
  z-index: 1;
}

.demo-media-cover {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a2a3a, #2a3a4a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-media-cover-text {
  font-size: 22px;
  color: rgba(255,255,255,0.3);
}

.demo-media-thumbs {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.demo-media-thumb-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #242832;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.demo-media-thumb-inner.focused {
  border-color: #4af;
  background: #2a3a50;
}

.demo-media-thumb-img {
  font-size: 28px;
  width: 40px;
  text-align: center;
}

.demo-media-thumb-label {
  font-size: 15px;
  color: #fff;
}
</style>
