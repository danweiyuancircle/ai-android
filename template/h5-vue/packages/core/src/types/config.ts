/**
 * 应用运行时配置
 * 由 public/{test,prod}-config.json 提供，启动时 loadConfig() 异步加载。
 * 模板仅保留通用字段；项目按需扩展（如 ai、defaultLocation 等业务字段）。
 */
export interface AppConfig {
  /** API 基础域名，用于构建完整请求 URL */
  apiBaseUrl: string;
  /**
   * 图片域名映射配置（专网图片代理）
   * key: 命中的原始前缀；value: 替换后的前缀
   */
  imageUrlMapping?: Record<string, string>;
  /** 接口鉴权 token */
  accessToken: string;
}
