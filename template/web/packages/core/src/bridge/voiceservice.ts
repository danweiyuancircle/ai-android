/**
 * voiceService js bridge methods for WebView (typescript version)
 * 语音 / TTS 相关桥接，独立于 ottService。每个方法在 android 环境下会被 android 注入，不存在就打印日志
 * 句柄：window.voiceService（壳侧由 VoiceBridge 单独注入，与 ottService 解耦）
 */

/**
 * VoiceServiceType
 * WebView注入的android原生语音接口方法类型声明
 * 句柄：window.voiceService（与ottService独立注入）
 */
type VoiceServiceType = {
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

// 工具方法: 检查window.voiceService是否存在
function getVoiceService(): any {
  const s = (window as any).voiceService;
  if (!s) {
    console.log("[voiceService] not found");
    return null;
  }
  return s;
}

/**
 * 语音服务统一对象暴露
 * 句柄：window.voiceService（壳侧由 VoiceBridge 单独注入，与 ottService 解耦）
 */
export const voiceService: VoiceServiceType = {
  releaseVoice(): void {
    const s = getVoiceService();
    if (s && typeof s.releaseVoice === "function") {
      try {
        s.releaseVoice();
      } catch (err) {
        console.log("[voiceService] releaseVoice error:", err);
      }
    }
  },
  playTts(text: string): void {
    const s = getVoiceService();
    if (s && typeof s.playTts === "function") {
      try {
        s.playTts(text);
      } catch (err) {
        console.log("[voiceService] playTts error:", err);
      }
    }
  },
  stopTts(): void {
    const s = getVoiceService();
    if (s && typeof s.stopTts === "function") {
      try {
        s.stopTts();
      } catch (err) {
        console.log("[voiceService] stopTts error:", err);
      }
    }
  },
  isTtsPlaying(): boolean {
    const s = getVoiceService();
    if (s && typeof s.isTtsPlaying === "function") {
      try {
        return s.isTtsPlaying();
      } catch (err) {
        console.log("[voiceService] isTtsPlaying error:", err);
      }
    }
    return false;
  },
};

/**
 * 语音识别事件监听器
 * Android会调用以下window全局函数来通知语音识别事件
 */
let voiceCallbacks: VoiceCallbacks = {};

// 注册全局监听函数，供Android调用
if (typeof window !== "undefined") {
  // 开始语音识别
  (window as any).onBeginSpeech = () => {
    console.log("[voiceService] 开始语音识别");
    voiceCallbacks.onBeginSpeech?.();
  };

  // 结束语音识别
  (window as any).onEndSpeech = () => {
    console.log("[voiceService] 结束语音识别");
    voiceCallbacks.onEndSpeech?.();
  };

  // 动态识别结果（实时）
  (window as any).onDynamicResult = (result: string) => {
    console.log("[voiceService] 动态识别结果:", result);
    voiceCallbacks.onDynamicResult?.(result);
  };

  // 最终识别结果
  (window as any).onFinalResult = (result: string) => {
    console.log("[voiceService] 最终识别结果:", result);
    voiceCallbacks.onFinalResult?.(result);
  };

  // 识别错误
  (window as any).onVoiceError = (error: string) => {
    console.error("[voiceService] 语音识别错误:", error);
    voiceCallbacks.onError?.(error);
  };

  // TTS开始播放
  (window as any).onTtsStart = (id: string) => {
    console.log("[voiceService] TTS开始播放:", id);
    voiceCallbacks.onTtsStart?.(id);
  };

  // TTS播放完成
  (window as any).onTtsDone = (id: string) => {
    console.log("[voiceService] TTS播放完成:", id);
    voiceCallbacks.onTtsDone?.(id);
  };
}

/**
 * 设置语音识别事件回调函数
 * @param callbacks 回调函数集合
 */
export function setVoiceCallbacks(callbacks: VoiceCallbacks) {
  voiceCallbacks = callbacks;
  console.log("[voiceService] 语音识别回调函数已设置");
}

/**
 * 清除语音识别回调函数
 */
export function clearVoiceCallbacks() {
  voiceCallbacks = {};
  console.log("[voiceService] 语音识别回调函数已清除");
}

/**
 * 获取当前的语音识别回调函数
 */
export function getVoiceCallbacks(): VoiceCallbacks {
  return voiceCallbacks;
}
