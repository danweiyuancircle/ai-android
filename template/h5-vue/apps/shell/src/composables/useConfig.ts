import { ref, readonly } from 'vue'
import type { AppConfig } from '@shell/core'
import { configManager } from '@shell/core'

const config = ref<AppConfig | null>(null)
const isLoading = ref(false)
const error = ref<Error | null>(null)

/**
 * 配置管理 Composable
 */
export function useConfig() {
  /**
   * 加载配置
   */
  const load = async () => {
    if (config.value) {
      return config.value
    }

    isLoading.value = true
    error.value = null

    try {
      config.value = await configManager.load()
      return config.value
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重新加载配置
   */
  const reload = async () => {
    config.value = null
    return load()
  }

  /**
   * 获取配置值
   */
  const getValue = <T = any>(path: string, defaultValue?: T): T | undefined => {
    if (!config.value) {
      return defaultValue
    }
    return configManager.getValue<T>(path) ?? defaultValue
  }

  return {
    config: readonly(config),
    isLoading: readonly(isLoading),
    error: readonly(error),
    load,
    reload,
    getValue
  }
}

