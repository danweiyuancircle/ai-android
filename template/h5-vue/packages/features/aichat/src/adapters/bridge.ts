/**
 * 第三方拉起 AIChat 的 bridge 适配（契约见 template/bridge-contract.md「第三方拉起 AIChat」）。
 * 基座通过 window.onNavigateToAIChat(query) 通知，此回调原属壳 core，
 * 因纯 AIChat 业务而归入本卡带。
 */

/**
 * 注册第三方拉起 AIChat 的 bridge 回调。
 * @param onNavigate 收到 query 时执行的跳转逻辑（通常 navigateToAIChat(router, route, query)）
 * @returns 注销函数，移除 window.onNavigateToAIChat
 */
export function registerAIChatDeepLink(onNavigate: (query: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  ;(window as any).onNavigateToAIChat = (query: string) => {
    console.log('[AIChat] 收到第三方拉起请求, query:', query)
    onNavigate(query ?? '')
  }
  console.log('[AIChat] 第三方拉起回调已注册')
  return () => {
    delete (window as any).onNavigateToAIChat
    console.log('[AIChat] 第三方拉起回调已注销')
  }
}
