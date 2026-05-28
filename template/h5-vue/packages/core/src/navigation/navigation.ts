import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import type { AreaItem } from "../types";
import { routerStack } from "./routerStack";
import { ottService } from "../bridge";

/**
 * 跳转到 AIChat 页面
 * 统一处理语音识别、第三方拉起等场景的跳转逻辑
 *
 * @param router Vue Router 实例
 * @param route 当前路由（用于判断是否已在 AIChat 页面）
 * @param query 查询文本
 */
export function navigateToAIChat(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  query: string
): void {
  console.log("[Navigation] 跳转到 AIChat, query:", query);

  // 检查当前路由是否已在 AIChat 页面
  const isAIChatPage = route.name === "AIChat";

  if (isAIChatPage) {
    // 如果当前已在 AIChat 页面，使用 replace 更新参数，复用当前页面
    console.log("[Navigation] 当前已在 AIChat 页面，replace 更新参数");
    router.replace({
      name: "AIChat",
      query: { text: query },
    });
  } else {
    // 如果不在 AIChat 页面，使用 push 跳转
    router.push({
      name: "AIChat",
      query: { text: query },
    });
  }
}

/**
 * 导航工具类
 * 处理应用内的路由跳转逻辑
 */
export class NavigationHelper {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  /**
   * 处理区域元素的点击事件
   * @param item 区域元素数据
   */
  handleItemClick(item: AreaItem): void {
    console.log("Item clicked:", item);
    const linkType = item.linkType;
    if (linkType) {
      this.navigateTo(linkType, {
        ...item,
        ...item.queryParams,
      });
    } else {
      ottService.showToast("敬请期待！")
    }
  }

  /**
   * 导航到指定路径
   * @param path 路由路径
   */
  navigateTo(
    path: string,
    query?: Record<string, any>,
    state?: Record<string, any>
  ): void {
    if (!path) {
      console.warn("Navigation path is empty");
      return;
    }

    try {
      this.router.push({ path: path, query: query || {}, state: state || {} });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }

  /**
   * 返回上一页
   * 如果栈中有历史记录，使用路由栈返回，否则使用浏览器返回
   */
  goBack(): void {
    if (routerStack.canGoBack()) {
      const previous = routerStack.getPrevious();
      console.log("[Navigation] Going back to:", previous?.path);
      this.router.back();
    } else {
      console.log("[Navigation] No previous route in stack");
      this.router.back();
    }
  }

  /**
   * 替换当前路由（不会添加到历史记录）
   * @param path 路由路径
   */
  replaceTo(path: string): void {
    if (!path) {
      console.warn("Navigation path is empty");
      return;
    }

    try {
      this.router.replace(path);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }

  /**
   * 获取路由栈信息
   */
  getStackInfo() {
    return routerStack.getStats();
  }

  /**
   * 判断是否可以返回
   */
  canGoBack(): boolean {
    return routerStack.canGoBack();
  }

  /**
   * 判断是否可以前进
   */
  canGoForward(): boolean {
    return routerStack.canGoForward();
  }

  /**
   * 获取当前路由在栈中的位置
   */
  getCurrentRoute() {
    return routerStack.getCurrent();
  }

  /**
   * 获取上一个路由信息
   */
  getPreviousRoute() {
    return routerStack.getPrevious();
  }

  /**
   * 打印路由栈（调试用）
   */
  printStack(): void {
    routerStack.printStack();
  }

  /**
   * 清空路由栈
   */
  clearStack(): void {
    routerStack.clear();
  }
}

/**
 * 创建导航辅助实例
 * @param router Vue Router 实例
 * @returns NavigationHelper 实例
 */
export function createNavigationHelper(router: Router): NavigationHelper {
  return new NavigationHelper(router);
}
