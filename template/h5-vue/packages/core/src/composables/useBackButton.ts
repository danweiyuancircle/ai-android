import { onMounted, onUnmounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getRouteCacheManager } from "./useRouteCache";
import { ottService, OTT_NATIVE_KEYDOWN_EVENT } from "../bridge";
import { useFocusable } from "../focus/useFocusManager";

/**
 * 全局返回键处理
 * 监听Android TV返回键，实现页面返回和缓存清理逻辑
 */
export function useBackButton() {
  const router = useRouter();
  const route = useRoute();
  const { getCurrentFocusKey, setFocus } = useFocusable();

  // 控制退出弹框显示
  const showExitDialog = ref(false);
  
  // 保存弹框弹出前的焦点位置
  let previousFocusKey: string | null = null;
  let nativeBackEventHandler: ((event: Event) => void) | null = null;
  let browserBackEventHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * 处理返回键事件
   * 由 Android 基座通过 JSBridge 调用，解决部分机顶盒无法收到返回键键值的问题
   */
  const handleBackButton = () => {
    console.log("[BackButton] Back key pressed from native bridge");
    console.log("[BackButton] Back key pressed, current route:", route.path);

    // 判断是否在根路由
    if (route.path === "/" || route.path === "") {
      // 在根路由，处理双击退出逻辑
      handleExitConfirm();
    } else {
      // 不在根路由，执行返回逻辑
      handleGoBack();
    }
  };

  /**
   * 执行返回上一页逻辑
   */
  const handleGoBack = () => {
    try {
      // 获取当前路由名称
      const currentRouteName = route.name as string;

      console.log("[BackButton] Going back from:", currentRouteName);

      // 从keep-alive缓存中移除当前路由
      const cacheManager = getRouteCacheManager();
      if (cacheManager && currentRouteName) {
        cacheManager.clearRouteCache(currentRouteName);
        console.log("[BackButton] Cleared cache for route:", currentRouteName);
      }
      // 执行路由返回
      router.back();

      console.log("[BackButton] Navigation back executed");
    } catch (error) {
      console.error("[BackButton] Error during back navigation:", error);
    }
  };

  /**
   * 处理退出确认（显示退出弹框）
   */
  const handleExitConfirm = () => {
    console.log("[BackButton] At root route, showing exit dialog");
    
    // 保存当前焦点位置
    previousFocusKey = getCurrentFocusKey();
    console.log("[BackButton] Saved previous focus key:", previousFocusKey);
    
    // 显示退出弹框
    showExitDialog.value = true;
  };

  /**
   * 确认退出应用
   */
  const confirmExit = () => {
    console.log("[BackButton] User confirmed exit");
    ottService.exitApp();
  };

  /**
   * 取消退出，恢复焦点
   */
  const cancelExit = () => {
    console.log("[BackButton] User cancelled exit");
    
    // 恢复之前的焦点位置
    if (previousFocusKey) {
      const focusKey = previousFocusKey;
      setTimeout(() => {
        setFocus(focusKey);
        console.log("[BackButton] Restored focus to:", focusKey);
      }, 100);
    }
  };

  /**
   * 注册返回键监听
   * 基座环境监听透传按键事件；浏览器环境监听键盘事件
   */
  const registerBackButton = () => {
    console.log("[BackButton] Registering back button listeners");

    if ((window as any).ottService) {
      nativeBackEventHandler = (event: Event) => {
        const nativeEvent = event as CustomEvent<{
          keyCode: number;
          keyCodeString: string;
          key: string;
        }>;
        const detail = nativeEvent.detail;
        if (!detail) {
          return;
        }
        if (detail.key === "Back" || detail.keyCodeString === "KEYCODE_BACK") {
          handleBackButton();
        }
      };
      window.addEventListener(OTT_NATIVE_KEYDOWN_EVENT, nativeBackEventHandler);
      return;
    }

    browserBackEventHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "BrowserBack") {
        event.preventDefault();
        handleBackButton();
      }
    };
    window.addEventListener("keydown", browserBackEventHandler);
  };

  /**
   * 注销返回键监听
   */
  const unregisterBackButton = () => {
    console.log("[BackButton] Clearing back button listeners");
    if (nativeBackEventHandler) {
      window.removeEventListener(
        OTT_NATIVE_KEYDOWN_EVENT,
        nativeBackEventHandler
      );
      nativeBackEventHandler = null;
    }
    if (browserBackEventHandler) {
      window.removeEventListener("keydown", browserBackEventHandler);
      browserBackEventHandler = null;
    }
  };

  return {
    registerBackButton,
    unregisterBackButton,
    handleBackButton,
    handleGoBack,
    showExitDialog,
    confirmExit,
    cancelExit,
  };
}

/**
 * 自动注册返回键监听（在组件挂载时注册，卸载时注销）
 */
export function useAutoBackButton() {
  const { 
    registerBackButton, 
    unregisterBackButton,
    showExitDialog,
    confirmExit,
    cancelExit 
  } = useBackButton();

  onMounted(() => {
    registerBackButton();
  });

  onUnmounted(() => {
    unregisterBackButton();
  });

  return {
    registerBackButton,
    unregisterBackButton,
    showExitDialog,
    confirmExit,
    cancelExit,
  };
}
