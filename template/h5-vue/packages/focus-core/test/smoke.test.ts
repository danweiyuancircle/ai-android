import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SpatialNavigation from '../src/spatial-navigation'

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
