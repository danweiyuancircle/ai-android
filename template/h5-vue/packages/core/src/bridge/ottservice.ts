/**
 * ottService js bridge methods for WebView (typescript version)
 * 以对象方式统一调用，便于管理。每个方法在android环境下会被android注入，如果不存在就打印日志
 * 句柄：window.ottService
 */

/**
 * OttServiceType
 * WebView注入的android原生接口方法类型声明
 */
type OttServiceType = {
  /**
   * 判断WebView是否可以后退
   */
  canGoBack: () => boolean;
  /**
   * 重新加载入口页（首页）
   */
  reloadIndex: () => void;
  /**
   * 重新加载当前页面
   */
  reload: () => void;
  /**
   * 显示一个Toast消息
   */
  showToast: (message: string) => void;
  /**
   *  退出应用
   * @param text 退出应用时激活系统语音的回传文本，可选
   */
  exitApp: (text?: string) => void;
  /**
   * 发送系统广播
   * @param json 广播意图数据（通常为IntentData结构对象）
   */
  sendBroadcast: (json: IntentData) => void;
  /**
   * 隐藏加载动画
   */
  hideLoading: () => void;
  /**
   * 释放语音
   */
  releaseVoice: () => void;
  /**
   * 播放TTS语音
   * @param text 要播放的文本
   */
  playTts: (text: string) => void;
  /**
   * 停止TTS语音播报
   */
  stopTts: () => void;
  /**
   * 是否正在播放TTS
   */
  isTtsPlaying: () => boolean;
};

/**
 * 语音识别相关回调事件类型
 */
type VoiceCallbacks = {
  /** 开始语音识别 */
  onBeginSpeech?: () => void;
  /** 结束语音识别 */
  onEndSpeech?: () => void;
  /** 动态识别结果回调 */
  onDynamicResult?: (result: string) => void;
  /** 最终识别结果回调 */
  onFinalResult?: (result: string) => void;
  /** 识别错误回调 */
  onError?: (error: string) => void;
  /** TTS开始播放回调 */
  onTtsStart?: (id: string) => void;
  /** TTS播放完成回调 */
  onTtsDone?: (id: string) => void;
};

/**
 * 原生按键透传事件名
 */
export const OTT_NATIVE_KEYDOWN_EVENT = "ott:native-keydown";

/**
 * 跳转 AIChat 回调类型（第三方拉起时传入的 query）
 */
type NavigateToAIChatCallback = (query: string) => void;

// 工具方法: 检查window.ottService是否存在
function getOttService(): any {
  const s = (window as any).ottService;
  if (!s) {
    console.log("[ottService] not found");
    return null;
  }
  return s;
}

/**
 * 统一对象暴露
 */
export const ottService: OttServiceType = {
  canGoBack(): boolean {
    const s = getOttService();
    if (s && typeof s.canGoBack === "function") {
      try {
        return s.canGoBack();
      } catch (err) {
        console.log("[ottService] canGoBack error:", err);
      }
    }
    return false;
  },
  reloadIndex(): void {
    const s = getOttService();
    if (s && typeof s.reloadIndex === "function") {
      try {
        s.reloadIndex();
      } catch (err) {
        console.log("[ottService] reloadIndex error:", err);
      }
    }
  },
  reload(): void {
    const s = getOttService();
    if (s && typeof s.reload === "function") {
      try {
        s.reload();
      } catch (err) {
        console.log("[ottService] reload error:", err);
      }
    }
  },
  showToast(message: string): void {
    const s = getOttService();
    if (s && typeof s.showToast === "function") {
      try {
        s.showToast(message);
      } catch (err) {
        console.log("[ottService] showToast error:", err);
      }
    }
  },
  exitApp(text?: string): void {
    const s = getOttService();
    if (s && typeof s.exitApp === "function") {
      this.releaseVoice();
      // 构建意图数据
      const intentData: IntentData = {
        action: "com.coocaa.voice.core.action.INTENT_CALLBACK",
        packageName: "com.skyworth.angel.voice",
        extras: {
          query: text ?? "",
          source: "cn.net.ocn.ai.tour",
        },
      };
      this.sendBroadcast(intentData);
      try {
        setTimeout(() => {
          s.exitApp();
        }, 100);
      } catch (err) {
        console.log("[ottService] exitApp error:", err);
      }
    }
  },
  sendBroadcast(intentData: IntentData): void {
    const s = getOttService();
    if (s && typeof s.sendBroadcast === "function") {
      try {
        s.sendBroadcast(JSON.stringify(intentData));
      } catch (err) {
        console.log("[ottService] sendBroadcast error:", err);
      }
    }
  },
  hideLoading(): void {
    const s = getOttService();
    if (s && typeof s.hideLoading === "function") {
      try {
        s.hideLoading();
      } catch (err) {
        console.log("[ottService] hideLoading error:", err);
      }
    }
  },
  releaseVoice(): void {
    const s = getOttService();
    if (s && typeof s.releaseVoice === "function") {
      try {
        s.releaseVoice();
      } catch (err) {
        console.log("[ottService] releaseVoice error:", err);
      }
    }
  },
  playTts(text: string): void {
    const s = getOttService();
    if (s && typeof s.playTts === "function") {
      try {
        s.playTts(text);
      } catch (err) {
        console.log("[ottService] playTts error:", err);
      }
    }
  },
  stopTts(): void {
    const s = getOttService();
    if (s && typeof s.stopTts === "function") {
      try {
        s.stopTts();
      } catch (err) {
        console.log("[ottService] stopTts error:", err);
      }
    }
  },
  isTtsPlaying(): boolean {
    const s = getOttService();
    if (s && typeof s.isTtsPlaying === "function") {
      try {
        return s.isTtsPlaying();
      } catch (err) {
        console.log("[ottService] isTtsPlaying error:", err);
      }
    }
    return false;
  },
};

/**
 * 意图数据接口
 */
export interface IntentData {
  /** 动作 */
  action?: string;
  /** 目标包名 */
  packageName: string;
  /** 目标类名（可选） */
  className?: string;
  /** 额外数据 */
  extras?: Record<string, string>;
}

/**
 * 语音识别事件监听器
 * Android会调用以下window全局函数来通知语音识别事件
 */
let voiceCallbacks: VoiceCallbacks = {};

// 注册全局监听函数，供Android调用
if (typeof window !== "undefined") {
  // 开始语音识别
  (window as any).onBeginSpeech = () => {
    console.log("[ottService] 开始语音识别");
    voiceCallbacks.onBeginSpeech?.();
  };

  // 结束语音识别
  (window as any).onEndSpeech = () => {
    console.log("[ottService] 结束语音识别");
    voiceCallbacks.onEndSpeech?.();
  };

  // 动态识别结果（实时）
  (window as any).onDynamicResult = (result: string) => {
    console.log("[ottService] 动态识别结果:", result);
    voiceCallbacks.onDynamicResult?.(result);
  };

  // 最终识别结果
  (window as any).onFinalResult = (result: string) => {
    console.log("[ottService] 最终识别结果:", result);
    voiceCallbacks.onFinalResult?.(result);
  };

  // 识别错误
  (window as any).onVoiceError = (error: string) => {
    console.error("[ottService] 语音识别错误:", error);
    voiceCallbacks.onError?.(error);
  };

  // TTS开始播放
  (window as any).onTtsStart = (id: string) => {
    console.log("[ottService] TTS开始播放:", id);
    voiceCallbacks.onTtsStart?.(id);
  };

  // TTS播放完成
  (window as any).onTtsDone = (id: string) => {
    console.log("[ottService] TTS播放完成:", id);
    voiceCallbacks.onTtsDone?.(id);
  };
}

/**
 * 设置语音识别事件回调函数
 * @param callbacks 回调函数集合
 */
export function setVoiceCallbacks(callbacks: VoiceCallbacks) {
  voiceCallbacks = callbacks;
  console.log("[ottService] 语音识别回调函数已设置");
}

/**
 * 清除语音识别回调函数
 */
export function clearVoiceCallbacks() {
  voiceCallbacks = {};
  console.log("[ottService] 语音识别回调函数已清除");
}

/**
 * 获取当前的语音识别回调函数
 */
export function getVoiceCallbacks(): VoiceCallbacks {
  return voiceCallbacks;
}

/**
 * 跳转 AIChat 回调（由 App 在 onMounted 时设置，内部使用 router 跳转）
 */
let navigateToAIChatCallback: NavigateToAIChatCallback | null = null;

function normalizeNativeKey(keyCode: number, keyCodeString?: string): string {
  switch (keyCodeString) {
    case "KEYCODE_BACK":
      return "Back";
    case "KEYCODE_DPAD_UP":
      return "ArrowUp";
    case "KEYCODE_DPAD_DOWN":
      return "ArrowDown";
    case "KEYCODE_DPAD_LEFT":
      return "ArrowLeft";
    case "KEYCODE_DPAD_RIGHT":
      return "ArrowRight";
    case "KEYCODE_DPAD_CENTER":
    case "KEYCODE_ENTER":
    case "KEYCODE_NUMPAD_ENTER":
      return "Enter";
  }

  switch (keyCode) {
    case 4:
      return "Back";
    case 19:
      return "ArrowUp";
    case 20:
      return "ArrowDown";
    case 21:
      return "ArrowLeft";
    case 22:
      return "ArrowRight";
    case 23:
    case 66:
    case 160:
      return "Enter";
    default:
      return "";
  }
}

function dispatchNativeKeyDownEvent(
  keyCode: number,
  keyCodeString: string,
  key: string
) {
  const detail = {
    keyCode,
    keyCodeString,
    key,
  };

  try {
    if (typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent(OTT_NATIVE_KEYDOWN_EVENT, { detail }));
      return;
    }
  } catch (error) {
    console.log("[ottService] CustomEvent dispatch failed:", error);
  }

  // 兼容旧内核：降级使用 document.createEvent
  const legacyEvent = document.createEvent("CustomEvent");
  legacyEvent.initCustomEvent(OTT_NATIVE_KEYDOWN_EVENT, false, false, detail);
  window.dispatchEvent(legacyEvent);
}

// 注册基座回调函数，供Android调用
if (typeof window !== "undefined") {
  (window as any).onNativeKeyDown = (
    keyCode: number,
    keyCodeString?: string
  ) => {
    const normalizedKey = normalizeNativeKey(keyCode, keyCodeString);
    const normalizedKeyCodeString = keyCodeString || "";
    console.log(
      "[ottService] 收到透传按键:",
      keyCode,
      normalizedKeyCodeString,
      normalizedKey
    );

    dispatchNativeKeyDownEvent(
      keyCode,
      normalizedKeyCodeString,
      normalizedKey
    );

  };

  // 第三方应用拉起 AIChat 页面：基座调用此函数并传入 query，网页跳转到 /ai-chat 并携带 query
  (window as any).onNavigateToAIChat = (query: string) => {
    console.log("[ottService] 收到跳转 AIChat 请求, query:", query);
    navigateToAIChatCallback?.(query ?? "");
  };
}

/**
 * 设置跳转 AIChat 回调函数
 * 当基座通过 onNavigateToAIChat 通知时，将使用此回调进行路由跳转（path: /ai-chat, query: { text }）
 * @param callback 接收 query 字符串，内部应执行 router.push({ path: '/ai-chat', query: { text: query } })
 */
export function setNavigateToAIChatCallback(
  callback: NavigateToAIChatCallback,
) {
  navigateToAIChatCallback = callback;
  console.log("[ottService] 跳转 AIChat 回调已设置");
}

/**
 * 清除跳转 AIChat 回调函数
 */
export function clearNavigateToAIChatCallback() {
  navigateToAIChatCallback = null;
  console.log("[ottService] 跳转 AIChat 回调已清除");
}
