import { onMounted, onUnmounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { hasOpenLayer } from "@chancestv/tv-focus";
import { getRouteCacheManager } from "./useRouteCache";
import { ottService, OTT_NATIVE_KEYDOWN_EVENT } from "../bridge";

/**
 * 全局返回键处理
 * 监听 Android TV 返回键，实现页面返回与缓存清理。
 * 退出弹框的焦点隔离 / 复焦由 @chancestv/tv-focus 的 FocusLayer 自动管理，不再手动保存/恢复焦点。
 */
export function useBackButton() {
  const router = useRouter();
  const route = useRoute();

  const showExitDialog = ref(false);
  let nativeBackEventHandler: ((event: Event) => void) | null = null;
  let browserBackEventHandler: ((event: KeyboardEvent) => void) | null = null;

  const handleBackButton = () => {
    // 模态层（EDialog/EDrawer 的 FocusLayer）打开时，全局返回键让位：
    // 本守卫负责"不后退/不弹退出框"，弹层内 useFocusLockedKeys 负责"关弹层"。
    // 两道防线互补且与监听注册顺序无关——勿因调整监听时序而移除本守卫。
    if (hasOpenLayer()) return;
    if (route.path === "/" || route.path === "") {
      showExitDialog.value = true;
    } else {
      handleGoBack();
    }
  };

  const handleGoBack = () => {
    try {
      const currentRouteName = route.name as string;
      const cacheManager = getRouteCacheManager();
      if (cacheManager && currentRouteName) {
        cacheManager.clearRouteCache(currentRouteName);
      }
      router.back();
    } catch (error) {
      console.error("[BackButton] back error:", error);
    }
  };

  const confirmExit = () => {
    ottService.exitApp();
  };

  // FocusLayer 关闭时焦点自动复位，无需手动恢复
  const cancelExit = () => {};

  const registerBackButton = () => {
    if ((window as any).ottService) {
      nativeBackEventHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string; keyCodeString?: string }>).detail;
        if (!detail) return;
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

  const unregisterBackButton = () => {
    if (nativeBackEventHandler) {
      window.removeEventListener(OTT_NATIVE_KEYDOWN_EVENT, nativeBackEventHandler);
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

/** 自动注册返回键监听（在组件挂载时注册，卸载时注销）*/
export function useAutoBackButton() {
  const api = useBackButton();
  onMounted(() => api.registerBackButton());
  onUnmounted(() => api.unregisterBackButton());
  return api;
}
