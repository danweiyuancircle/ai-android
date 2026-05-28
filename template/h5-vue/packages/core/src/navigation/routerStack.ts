import type { RouteLocationNormalized } from 'vue-router'

/**
 * 路由栈项
 */
export interface RouterStackItem {
  /** 路由路径 */
  path: string
  /** 路由名称 */
  name: string | symbol | null | undefined
  /** 完整路径（包含查询参数和hash） */
  fullPath: string
  /** 路由参数 */
  params: Record<string, any>
  /** 查询参数 */
  query: Record<string, any>
  /** 进入时间戳 */
  timestamp: number
}

/**
 * 导航方向
 */
export type NavigationDirection = 'forward' | 'back' | 'replace' | 'unknown'

/**
 * 路由栈管理器
 */
export class RouterStack {
  private stack: RouterStackItem[] = []
  private maxStackSize: number
  private currentIndex: number = -1

  constructor(maxStackSize: number = 50) {
    this.maxStackSize = maxStackSize
  }

  /**
   * 添加路由到栈中
   * @param route 路由信息
   * @param direction 导航方向
   */
  push(route: RouteLocationNormalized, direction: NavigationDirection = 'forward'): void {
    const item: RouterStackItem = {
      path: route.path,
      name: route.name,
      fullPath: route.fullPath,
      params: { ...route.params },
      query: { ...route.query },
      timestamp: Date.now()
    }

    if (direction === 'back') {
      // 后退操作：移除当前位置之后的所有项
      this.currentIndex--
      if (this.currentIndex < 0) {
        this.currentIndex = 0
      }
    } else if (direction === 'replace') {
      // 替换操作：替换当前项
      if (this.currentIndex >= 0 && this.currentIndex < this.stack.length) {
        this.stack[this.currentIndex] = item
      } else {
        this.stack.push(item)
        this.currentIndex = this.stack.length - 1
      }
    } else {
      // 前进操作：添加新项
      // 移除当前位置之后的所有项（如果有的话）
      if (this.currentIndex < this.stack.length - 1) {
        this.stack = this.stack.slice(0, this.currentIndex + 1)
      }
      
      this.stack.push(item)
      this.currentIndex = this.stack.length - 1

      // 限制栈大小
      if (this.stack.length > this.maxStackSize) {
        this.stack.shift()
        this.currentIndex--
      }
    }

    console.log('[RouterStack] Push:', {
      direction,
      currentPath: item.path,
      stackSize: this.stack.length,
      currentIndex: this.currentIndex
    })
  }

  /**
   * 获取当前路由
   */
  getCurrent(): RouterStackItem | null {
    return this.stack[this.currentIndex] || null
  }

  /**
   * 获取上一个路由
   */
  getPrevious(): RouterStackItem | null {
    if (this.currentIndex > 0) {
      return this.stack[this.currentIndex - 1]
    }
    return null
  }

  /**
   * 获取下一个路由（如果存在）
   */
  getNext(): RouterStackItem | null {
    if (this.currentIndex < this.stack.length - 1) {
      return this.stack[this.currentIndex + 1]
    }
    return null
  }

  /**
   * 获取整个路由栈
   */
  getStack(): RouterStackItem[] {
    return [...this.stack]
  }

  /**
   * 获取栈的大小
   */
  getSize(): number {
    return this.stack.length
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * 判断是否可以后退
   */
  canGoBack(): boolean {
    return this.currentIndex > 0
  }

  /**
   * 判断是否可以前进
   */
  canGoForward(): boolean {
    return this.currentIndex < this.stack.length - 1
  }

  /**
   * 清空路由栈
   */
  clear(): void {
    this.stack = []
    this.currentIndex = -1
    console.log('[RouterStack] Cleared')
  }

  /**
   * 查找路由在栈中的位置
   * @param path 路由路径
   * @returns 索引数组（可能有多个相同路径）
   */
  findByPath(path: string): number[] {
    const indices: number[] = []
    this.stack.forEach((item, index) => {
      if (item.path === path) {
        indices.push(index)
      }
    })
    return indices
  }

  /**
   * 判断路由是否在栈中
   * @param path 路由路径
   */
  hasPath(path: string): boolean {
    return this.stack.some(item => item.path === path)
  }

  /**
   * 获取路由栈的统计信息
   */
  getStats() {
    return {
      totalSize: this.stack.length,
      currentIndex: this.currentIndex,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      currentPath: this.getCurrent()?.path || null,
      previousPath: this.getPrevious()?.path || null
    }
  }

  /**
   * 打印路由栈信息（调试用）
   */
  printStack(): void {
    console.log('=== Router Stack ===')
    this.stack.forEach((item, index) => {
      const isCurrent = index === this.currentIndex
      console.log(`${isCurrent ? '→' : ' '} [${index}] ${item.path} (${new Date(item.timestamp).toLocaleTimeString()})`)
    })
    console.log('===================')
  }
}

// 创建全局路由栈实例
export const routerStack = new RouterStack()

/**
 * 判断导航方向
 * @param to 目标路由
 * @param from 来源路由
 */
export function detectNavigationDirection(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): NavigationDirection {
  const currentRoute = routerStack.getCurrent()
  const previousRoute = routerStack.getPrevious()

  // 如果目标路由与上一个路由相同，判断为后退
  if (previousRoute && to.fullPath === previousRoute.fullPath) {
    return 'back'
  }

  // 如果目标路由与当前路由相同，判断为替换
  if (currentRoute && to.fullPath === currentRoute.fullPath) {
    return 'replace'
  }

  // 默认为前进
  return 'forward'
}
