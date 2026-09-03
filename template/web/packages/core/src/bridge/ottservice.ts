/**
 * ottService js bridge methods for WebView (typescript version)
 * 以对象方式统一调用，便于管理。每个方法在android环境下会被android注入，如果不存在就打印日志
 * 句柄：window.ottService
 *
 * 语音 / TTS 桥接已拆到独立的 voiceservice.ts（句柄 window.voiceService）；
 * exitApp 默认行为需先释放语音，故从同目录 voiceservice 引入 voiceService。
 */

import { voiceService } from "./voiceservice";

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
   * 获取设备/应用基础信息
   * @returns 基础信息对象；非Android环境或获取失败返回null
   */
  getBaseInfo: () => BaseInfo | null;
};

/**
 * 设备/应用基础信息
 */
export interface BaseInfo {
  /** 设备MAC地址 */
  mac: string;
  /** 设备IP地址 */
  ip: string;
  /** 应用版本名 */
  versionName: string;
  /** 应用版本号 */
  versionCode: number;
  /** 应用包名 */
  packageName: string;
  /** 设备型号 */
  deviceModel: string;
  /** 设备厂商 */
  vendor: string;
  /** Android系统版本号 */
  androidVersion: string;
  /** Android API级别 */
  androidSdkInt: number;
}

/**
 * 原生按键透传事件名
 */
export const OTT_NATIVE_KEYDOWN_EVENT = "ott:native-keydown";

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
      voiceService.releaseVoice();
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
  getBaseInfo(): BaseInfo | null {
    const s = getOttService();
    if (s && typeof s.getBaseInfo === "function") {
      try {
        // 原生 @JavascriptInterface 只能返回 String，故回传 JSON 字符串，H5 侧解析为对象
        const json = s.getBaseInfo();
        return json ? (JSON.parse(json) as BaseInfo) : null;
      } catch (err) {
        console.log("[ottService] getBaseInfo error:", err);
      }
    }
    return null;
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
}
