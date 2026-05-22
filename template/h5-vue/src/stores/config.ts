import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppConfig } from '@/types/config'
import { configManager } from '@/utils/config'

/**
 * 配置状态管理
 */
export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig>(configManager.get())

  /**
   * 重新加载配置
   */
  const reload = async () => {
    config.value = await configManager.reload()
  }

  /**
   * 获取配置值
   */
  const getValue = <T = any>(path: string): T | undefined => {
    return configManager.getValue<T>(path)
  }

  return {
    config,
    reload,
    getValue
  }
})
