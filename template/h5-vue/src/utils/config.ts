import type { AppConfig } from '@/types/config'
import { isProd } from './appUtils'

class ConfigManager {
  private config: AppConfig | null = null
  private loading: Promise<AppConfig> | null = null

  /**
   * 加载配置文件
   */
  async load(): Promise<AppConfig> {
    // 如果已经在加载中，返回加载Promise
    if (this.loading) {
      return this.loading
    }

    // 如果已经加载完成，直接返回
    if (this.config) {
      return this.config
    }

    // 开始加载
    this.loading = this.fetchConfig()
    
    try {
      this.config = await this.loading
      return this.config
    } finally {
      this.loading = null
    }
  }

  /**
   * 从服务器获取配置文件
   */
  private async fetchConfig(): Promise<AppConfig> {
    try {
      const configFile = isProd() ? 'prod-config.json' : 'test-config.json'
      console.log('configFile', configFile)
      const response = await fetch(configFile)
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }
      const config = await response.json()
      console.log('配置文件加载成功:', config)
      
      // 读取 token.json 的 data 字段并赋值给 accessToken
      try {
        const tokenResponse = await fetch('token.json')
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          if (tokenData.data) {
            config.accessToken = tokenData.data
            console.log('Token 加载成功',tokenData)
          }
        }
      } catch (tokenError) {
        console.warn('加载 token.json 失败，使用配置文件中的 accessToken:', tokenError)
      }
      
      return config
    } catch (error) {
      console.error('加载配置文件失败，使用默认配置:', error)
      return this.getDefaultConfig()
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      apiBaseUrl: '',
      imageUrlMapping: {},
      accessToken: ''
    }
  }

  /**
   * 获取配置（同步方法，需要先调用load）
   */
  get(): AppConfig {
    if (!this.config) {
      console.warn('配置未加载，返回默认配置')
      return this.getDefaultConfig()
    }
    return this.config
  }

  /**
   * 获取指定路径的配置值
   */
  getValue<T = any>(path: string): T | undefined {
    const config = this.get()
    const keys = path.split('.')
    let value: any = config

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value as T
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<AppConfig> {
    this.config = null
    this.loading = null
    return this.load()
  }
}

// 导出单例
export const configManager = new ConfigManager()

// 导出便捷方法
export const loadConfig = () => configManager.load()
export const getConfig = () => configManager.get()
export const getConfigValue = <T = any>(path: string) => configManager.getValue<T>(path)
export const reloadConfig = () => configManager.reload()
