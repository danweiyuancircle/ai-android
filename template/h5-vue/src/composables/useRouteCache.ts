import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { routerStack } from '@/router'

/**
 * 路由缓存管理
 * 根据路由栈自动管理页面缓存
 */
export function useRouteCache(maxCache: number = 10) {
  const router = useRouter()
  const route = useRoute()

  // 缓存的路由名称列表
  const cachedRoutes = ref<Set<string>>(new Set())

  // 需要排除缓存的路由（可配置）
  const excludedRoutes = ref<Set<string>>(new Set())

  /**
   * 根据路由栈更新缓存列表
   */
  const updateCache = () => {
    const stack = routerStack.getStack()
    const newCache = new Set<string>()

    // 遍历路由栈，将所有路由名称加入缓存
    stack.forEach(item => {
      const routeName = item.name as string
      if (routeName && !excludedRoutes.value.has(routeName)) {
        newCache.add(routeName)
      }
    })

    // 限制缓存数量
    if (newCache.size > maxCache) {
      // 保留最新的 maxCache 个路由
      const cacheArray = Array.from(newCache)
      const recentRoutes = cacheArray.slice(-maxCache)
      cachedRoutes.value = new Set(recentRoutes)
      
      console.log('[RouteCache] Cache limit reached, keeping recent routes:', recentRoutes)
    } else {
      cachedRoutes.value = newCache
    }

    console.log('[RouteCache] Updated cache:', Array.from(cachedRoutes.value))
  }

  /**
   * 添加需要排除的路由
   */
  const excludeRoute = (routeName: string) => {
    excludedRoutes.value.add(routeName)
    cachedRoutes.value.delete(routeName)
  }

  /**
   * 移除排除的路由
   */
  const includeRoute = (routeName: string) => {
    excludedRoutes.value.delete(routeName)
    updateCache()
  }

  /**
   * 手动清除指定路由的缓存
   */
  const clearRouteCache = (routeName: string) => {
    cachedRoutes.value.delete(routeName)
    console.log('[RouteCache] Cleared cache for:', routeName)
  }

  /**
   * 清除所有缓存
   */
  const clearAllCache = () => {
    cachedRoutes.value.clear()
    console.log('[RouteCache] Cleared all cache')
  }

  /**
   * 获取缓存的路由列表（数组格式，供 KeepAlive 使用）
   */
  const include = computed(() => Array.from(cachedRoutes.value))

  /**
   * 获取排除的路由列表
   */
  const exclude = computed(() => Array.from(excludedRoutes.value))

  /**
   * 获取缓存统计信息
   */
  const cacheStats = computed(() => ({
    total: cachedRoutes.value.size,
    max: maxCache,
    cached: Array.from(cachedRoutes.value),
    excluded: Array.from(excludedRoutes.value)
  }))

  // 监听路由变化，自动更新缓存
  watch(
    () => route.fullPath,
    () => {
      // 延迟更新，确保路由栈已经更新
      setTimeout(() => {
        updateCache()
      }, 0)
    },
    { immediate: true }
  )

  // 监听路由栈变化
  const watchStackChanges = () => {
    // 可以通过监听路由栈的变化来触发缓存更新
    // 这里使用 router 的 afterEach 钩子
    router.afterEach(() => {
      setTimeout(() => {
        updateCache()
      }, 0)
    })
  }

  // 初始化
  watchStackChanges()
  updateCache()

  return {
    // 响应式数据
    include,
    exclude,
    cacheStats,

    // 方法
    updateCache,
    excludeRoute,
    includeRoute,
    clearRouteCache,
    clearAllCache
  }
}

/**
 * 创建全局路由缓存管理器单例
 */
let globalCacheManager: ReturnType<typeof useRouteCache> | null = null

export function createRouteCacheManager(maxCache: number = 10) {
  if (!globalCacheManager) {
    globalCacheManager = useRouteCache(maxCache)
  }
  return globalCacheManager
}

export function getRouteCacheManager() {
  return globalCacheManager
}
