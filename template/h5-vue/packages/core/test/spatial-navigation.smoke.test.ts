import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SpatialNavigation from '../src/focus/engine/spatial-navigation'

/**
 * 冒烟测试：fork 后的核心 API 在 jsdom 下 init / add / focus / move 正常。
 * 不重复测上游已经覆盖的几何算法细节。
 */

function mockRect(el: HTMLElement, left: number, top: number, w = 100, h = 100) {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + w,
      bottom: top + h,
      width: w,
      height: h,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect)
  // jsdom 不计算布局；spatial-navigation 用 offsetWidth/Height 判断元素可见性
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => h })
}

function makeGrid(rows: number, cols: number) {
  const root = document.createElement('div')
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div')
      cell.className = 'cell'
      cell.id = `cell-${r * cols + c}`
      cell.tabIndex = -1
      mockRect(cell, c * 100, r * 100)
      root.appendChild(cell)
    }
  }
  document.body.appendChild(root)
  return root
}

describe('SpatialNavigation 冒烟', () => {
  beforeEach(() => {
    SpatialNavigation.init()
  })

  afterEach(() => {
    SpatialNavigation.uninit()
    document.body.replaceChildren()
  })

  it('init + add section + focus 第一个元素', () => {
    makeGrid(3, 3)
    const id = SpatialNavigation.add({ selector: '.cell' })
    expect(typeof id).toBe('string')
    SpatialNavigation.makeFocusable(id)
    const ok = SpatialNavigation.focus('#cell-0')
    expect(ok).toBe(true)
    expect(document.activeElement?.id).toBe('cell-0')
  })

  it('方向键 right 把焦点从 cell-0 移到 cell-1', () => {
    makeGrid(3, 3)
    const id = SpatialNavigation.add({ selector: '.cell' })
    SpatialNavigation.makeFocusable(id)
    SpatialNavigation.focus('#cell-0')
    const moved = SpatialNavigation.move('right')
    expect(moved).toBe(true)
    expect(document.activeElement?.id).toBe('cell-1')
  })

  it('方向键 down 把焦点从 cell-0 移到 cell-3（下一行同列）', () => {
    makeGrid(3, 3)
    const id = SpatialNavigation.add({ selector: '.cell' })
    SpatialNavigation.makeFocusable(id)
    SpatialNavigation.focus('#cell-0')
    const moved = SpatialNavigation.move('down')
    expect(moved).toBe(true)
    expect(document.activeElement?.id).toBe('cell-3')
  })

  it('跨 section 就近：按下落到最近一行的非同列元素，而非远处同列元素', () => {
    // 复现「组件总览」：焦点在按钮 section 按下，应落到最近一行（另一 section、左侧）元素，
    // 而不是跳过它去找远处恰好同列的 section。三者各属独立 section → 走跨 section 就近。
    function cell(cls: string, id: string, left: number, top: number) {
      const el = document.createElement('div')
      el.className = cls
      el.id = id
      el.tabIndex = -1
      mockRect(el, left, top, 100, 50)
      document.body.appendChild(el)
    }
    cell('j-btn', 'btn', 200, 0) // 焦点起点（按钮 section）
    cell('j-near', 'near', 0, 100) // 最近一行 section，但在左侧（与 btn 不同列）
    cell('j-far', 'far', 200, 300) // 远处一行 section，但与 btn 同列

    SpatialNavigation.add({ selector: '.j-btn', restrict: 'self-first' })
    SpatialNavigation.add({ selector: '.j-near', restrict: 'self-first' })
    SpatialNavigation.add({ selector: '.j-far', restrict: 'self-first' })
    SpatialNavigation.makeFocusable()
    SpatialNavigation.focus('#btn')
    SpatialNavigation.move('down')

    expect(document.activeElement?.id).toBe('near')
  })

  it('section 内：左移优先同行相邻项，不被斜下方水平更近的元素抢走', () => {
    // 复现卡片墙「精选2 按左聚焦到精选4 而非精选1」：变宽卡片下，
    // 斜下方元素右缘水平上离目标中心更近，但同 section 内应保持同行优先。
    function cell(id: string, left: number, top: number, w: number) {
      const el = document.createElement('div')
      el.className = 'jrow'
      el.id = id
      el.tabIndex = -1
      mockRect(el, left, top, w, 50)
      document.body.appendChild(el)
    }
    cell('mid', 200, 0, 100) // 焦点起点，中心 x=250
    cell('same', 0, 0, 100) // 同行左邻，右缘 x=100
    cell('belowleft', 50, 100, 180) // 斜下方，右缘 x=230（水平上离 250 更近）

    SpatialNavigation.add({ selector: '.jrow', restrict: 'self-first' })
    SpatialNavigation.makeFocusable()
    SpatialNavigation.focus('#mid')
    SpatialNavigation.move('left')

    expect(document.activeElement?.id).toBe('same')
  })

  it('跨容器导航：优先同滚动容器内（含已滚出视口）的候选，固定头部仅作兜底', () => {
    // 复现「卡片行被钉在视口顶部、上方内容已滚出」按上误入固定页头的问题。
    // 结构：clip 容器内含 img(已滚出，y 为负) 与 card(视口内)；容器外含 back(页头)。
    function cell(cls: string, id: string, left: number, top: number) {
      const el = document.createElement('div')
      el.className = cls
      el.id = id
      el.tabIndex = -1
      mockRect(el, left, top, 100, 100)
      return el
    }
    const back = cell('jx-back', 'jx-back', 0, 0) // 页头：容器外，y=0..100
    document.body.appendChild(back)

    const scroll = document.createElement('div') // 滚动/裁剪容器
    scroll.style.overflowX = 'hidden'
    scroll.style.overflowY = 'hidden'
    const img = cell('jx-img', 'jx-img', 0, -260) // 同容器，已滚出视口上方
    const card = cell('jx-card', 'jx-card', 0, 300) // 同容器，视口内（焦点起点）
    scroll.appendChild(img)
    scroll.appendChild(card)
    document.body.appendChild(scroll)

    // 三个独立 section：页头 / 图片行 / 卡片行
    SpatialNavigation.add({ selector: '.jx-back', restrict: 'self-first' })
    SpatialNavigation.add({ selector: '.jx-img', restrict: 'self-first' })
    SpatialNavigation.add({ selector: '.jx-card', restrict: 'self-first' })
    SpatialNavigation.makeFocusable()
    SpatialNavigation.focus('#jx-card')
    SpatialNavigation.move('up')

    // 像素上 back(y=0..100) 比 img(y=-260) 更近，但 img 与 card 同容器 → 应选 img
    expect(document.activeElement?.id).toBe('jx-img')
  })

  it('restrict: self-only 阻止跨 section 跳转', () => {
    makeGrid(1, 3)

    const root2 = document.createElement('div')
    const farCell = document.createElement('div')
    farCell.className = 'far-cell'
    farCell.id = 'far-0'
    farCell.tabIndex = -1
    mockRect(farCell, 500, 0)
    root2.appendChild(farCell)
    document.body.appendChild(root2)

    SpatialNavigation.add({ selector: '.cell', restrict: 'self-only' })
    SpatialNavigation.add({ selector: '.far-cell' })
    SpatialNavigation.makeFocusable()
    SpatialNavigation.focus('#cell-2')
    const moved = SpatialNavigation.move('right')
    expect(moved).toBe(false)
    expect(document.activeElement?.id).toBe('cell-2')
  })

  it('pause 后 keydown 监听暂停，move 显式调用仍工作', () => {
    makeGrid(1, 3)
    SpatialNavigation.add({ selector: '.cell' })
    SpatialNavigation.makeFocusable()
    SpatialNavigation.focus('#cell-0')
    SpatialNavigation.pause()
    const moved = SpatialNavigation.move('right')
    expect(moved).toBe(true)
    expect(document.activeElement?.id).toBe('cell-1')
    SpatialNavigation.resume()
  })
})
