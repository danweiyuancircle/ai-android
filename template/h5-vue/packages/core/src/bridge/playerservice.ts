/**
 * playerService js bridge methods for WebView (typescript version)
 * 播放器相关桥接，独立于 ottService / voiceService。每个方法在 android 环境下会被 android 注入，不存在就打印日志。
 * 句柄：window.playerService（壳侧由 PlayerBridge 单独注入，与 ottService / voiceService 解耦）。
 *
 * 多实例：create / setup 同步返回一个 playerId，后续所有操作 / 查询都带上该 id；回调首参也是 playerId，
 * H5 据此区分是哪个播放器实例。create 时实际建 View 在原生主线程异步完成，但 id 立即返回，后续对该 id 的操作会排在其后。
 *
 * 背播：壳把播放器容器放在 WebView 之下并将 WebView 背景设为透明；H5 页面背景需透明，视频才会透出。
 * 多引擎：通过 create(playerType) 或 setup({ playerType }) 选择引擎（如 "ijk" / "native"），不同实例可用不同引擎。
 */

/**
 * 播放器实例 id（由原生 create / setup 返回）
 */
export type PlayerId = string;

/**
 * 播放器引擎类型（与壳侧 PlayerType 对应；壳未注册的类型会回退默认引擎）
 */
export type PlayerType = "ijk" | "native" | (string & {});

/**
 * setup 便捷起播配置
 */
export interface PlayerSetupOptions {
  /** 引擎类型，默认 "ijk" */
  playerType?: PlayerType;
  /** 播放地址 */
  url?: string;
  /** 是否静音 */
  mute?: boolean;
  /** 纵横比：1 铺满 / 2 原比例 / 3 16:9 / 4 4:3 */
  aspectRatio?: number;
  /** 倍速 */
  speed?: number;
  /** 设置数据源后是否自动起播，默认 true */
  autoPlay?: boolean;
}

/**
 * PlayerServiceType
 * WebView 注入的 android 原生播放器接口方法类型声明
 * 句柄：window.playerService（与 ottService / voiceService 独立注入）
 *
 * 多实例：create / setup 返回 playerId，其余方法首参均为 playerId。
 */
type PlayerServiceType = {
  /** 创建 / 切换引擎并返回 playerId */
  create: (playerType: PlayerType) => PlayerId;
  /** 便捷起播：一次性创建实例并起播，返回 playerId */
  setup: (options: PlayerSetupOptions) => PlayerId;
  /** 设置播放地址 */
  setDataSource: (playerId: PlayerId, url: string) => void;
  /** 开始 / 恢复播放 */
  start: (playerId: PlayerId) => void;
  /** 暂停 */
  pause: (playerId: PlayerId) => void;
  /** 停止 */
  stop: (playerId: PlayerId) => void;
  /** 释放指定播放器实例 */
  release: (playerId: PlayerId) => void;
  /** 释放全部播放器实例 */
  releaseAll: () => void;
  /** seek 到指定位置（毫秒） */
  seekTo: (playerId: PlayerId, position: number) => void;
  /** 静音开关 */
  setMute: (playerId: PlayerId, mute: boolean) => void;
  /** 倍速播放 */
  setSpeed: (playerId: PlayerId, speed: number) => void;
  /** 设置纵横比（1 铺满 / 2 原比例 / 3 16:9 / 4 4:3） */
  setAspectRatio: (playerId: PlayerId, ratio: number) => void;
  /** SurfaceView 是否置顶（背播默认 false） */
  setZOrderOnTop: (playerId: PlayerId, onTop: boolean) => void;
  /** SurfaceView 是否作为媒体覆盖层 */
  setZOrderMediaOverlay: (playerId: PlayerId, overlay: boolean) => void;
  /** 是否正在播放 */
  isPlaying: (playerId: PlayerId) => boolean;
  /** 是否静音 */
  isMute: (playerId: PlayerId) => boolean;
  /** 总时长（毫秒） */
  getDuration: (playerId: PlayerId) => number;
  /** 当前播放位置（毫秒） */
  getCurrentPosition: (playerId: PlayerId) => number;
};

/**
 * 播放器事件回调类型（首参 playerId 区分实例）
 */
type PlayerCallbacks = {
  /** 已准备完成（可播放） */
  onPrepared?: (playerId: PlayerId) => void;
  /** 播放完成 */
  onCompletion?: (playerId: PlayerId) => void;
  /** 播放错误 */
  onError?: (playerId: PlayerId, what: number, extra: string) => void;
  /** 播放流信息（缓冲开始/结束、首帧渲染等） */
  onInfo?: (playerId: PlayerId, what: number, extra: string) => void;
  /** 缓冲进度（0-100） */
  onBufferingUpdate?: (playerId: PlayerId, percent: number) => void;
  /** seek 完成 */
  onSeekComplete?: (playerId: PlayerId) => void;
  /** 播放状态变化（1 播放中 / 2 暂停） */
  onStateChange?: (playerId: PlayerId, state: number) => void;
};

// 工具方法：检查 window.playerService 是否存在
function getPlayerService(): any {
  const s = (window as any).playerService;
  if (!s) {
    console.log("[playerService] not found");
    return null;
  }
  return s;
}

// 工具方法：调用一个无返回值的原生方法，统一容错
function callVoid(name: string, args: any[] = []): void {
  const s = getPlayerService();
  if (s && typeof s[name] === "function") {
    try {
      s[name](...args);
    } catch (err) {
      console.log(`[playerService] ${name} error:`, err);
    }
  }
}

// 工具方法：调用返回字符串（playerId）的原生方法，统一容错
function callString(name: string, args: any[] = []): string {
  const s = getPlayerService();
  if (s && typeof s[name] === "function") {
    try {
      return s[name](...args) ?? "";
    } catch (err) {
      console.log(`[playerService] ${name} error:`, err);
    }
  }
  return "";
}

/**
 * 播放器服务统一对象暴露
 * 句柄：window.playerService（壳侧由 PlayerBridge 单独注入）
 */
export const playerService: PlayerServiceType = {
  create(playerType: PlayerType): PlayerId {
    return callString("create", [playerType]);
  },
  setup(options: PlayerSetupOptions): PlayerId {
    // 原生 setup(json) 接收 JSON 字符串（@JavascriptInterface 仅支持基本类型与 String）
    return callString("setup", [JSON.stringify(options ?? {})]);
  },
  setDataSource(playerId: PlayerId, url: string): void {
    callVoid("setDataSource", [playerId, url]);
  },
  start(playerId: PlayerId): void {
    callVoid("start", [playerId]);
  },
  pause(playerId: PlayerId): void {
    callVoid("pause", [playerId]);
  },
  stop(playerId: PlayerId): void {
    callVoid("stop", [playerId]);
  },
  release(playerId: PlayerId): void {
    callVoid("release", [playerId]);
  },
  releaseAll(): void {
    callVoid("releaseAll");
  },
  seekTo(playerId: PlayerId, position: number): void {
    callVoid("seekTo", [playerId, position]);
  },
  setMute(playerId: PlayerId, mute: boolean): void {
    callVoid("setMute", [playerId, mute]);
  },
  setSpeed(playerId: PlayerId, speed: number): void {
    callVoid("setSpeed", [playerId, speed]);
  },
  setAspectRatio(playerId: PlayerId, ratio: number): void {
    callVoid("setAspectRatio", [playerId, ratio]);
  },
  setZOrderOnTop(playerId: PlayerId, onTop: boolean): void {
    callVoid("setZOrderOnTop", [playerId, onTop]);
  },
  setZOrderMediaOverlay(playerId: PlayerId, overlay: boolean): void {
    callVoid("setZOrderMediaOverlay", [playerId, overlay]);
  },
  isPlaying(playerId: PlayerId): boolean {
    const s = getPlayerService();
    if (s && typeof s.isPlaying === "function") {
      try {
        return s.isPlaying(playerId);
      } catch (err) {
        console.log("[playerService] isPlaying error:", err);
      }
    }
    return false;
  },
  isMute(playerId: PlayerId): boolean {
    const s = getPlayerService();
    if (s && typeof s.isMute === "function") {
      try {
        return s.isMute(playerId);
      } catch (err) {
        console.log("[playerService] isMute error:", err);
      }
    }
    return false;
  },
  getDuration(playerId: PlayerId): number {
    const s = getPlayerService();
    if (s && typeof s.getDuration === "function") {
      try {
        return s.getDuration(playerId);
      } catch (err) {
        console.log("[playerService] getDuration error:", err);
      }
    }
    return 0;
  },
  getCurrentPosition(playerId: PlayerId): number {
    const s = getPlayerService();
    if (s && typeof s.getCurrentPosition === "function") {
      try {
        return s.getCurrentPosition(playerId);
      } catch (err) {
        console.log("[playerService] getCurrentPosition error:", err);
      }
    }
    return 0;
  },
};

/**
 * 播放器事件监听器
 * Android 会调用以下 window 全局函数来通知播放器事件（首参 playerId）
 */
let playerCallbacks: PlayerCallbacks = {};

// 注册全局监听函数，供 Android 调用
if (typeof window !== "undefined") {
  (window as any).onPlayerPrepared = (playerId: PlayerId) => {
    console.log("[playerService] onPrepared", playerId);
    playerCallbacks.onPrepared?.(playerId);
  };

  (window as any).onPlayerCompletion = (playerId: PlayerId) => {
    console.log("[playerService] onCompletion", playerId);
    playerCallbacks.onCompletion?.(playerId);
  };

  (window as any).onPlayerError = (playerId: PlayerId, what: number, extra: string) => {
    console.error("[playerService] onError:", playerId, what, extra);
    playerCallbacks.onError?.(playerId, what, extra);
  };

  (window as any).onPlayerInfo = (playerId: PlayerId, what: number, extra: string) => {
    console.log("[playerService] onInfo:", playerId, what, extra);
    playerCallbacks.onInfo?.(playerId, what, extra);
  };

  (window as any).onPlayerBufferingUpdate = (playerId: PlayerId, percent: number) => {
    console.log("[playerService] onBufferingUpdate:", playerId, percent);
    playerCallbacks.onBufferingUpdate?.(playerId, percent);
  };

  (window as any).onPlayerSeekComplete = (playerId: PlayerId) => {
    console.log("[playerService] onSeekComplete", playerId);
    playerCallbacks.onSeekComplete?.(playerId);
  };

  (window as any).onPlayerStateChange = (playerId: PlayerId, state: number) => {
    console.log("[playerService] onStateChange:", playerId, state);
    playerCallbacks.onStateChange?.(playerId, state);
  };
}

/**
 * 设置播放器事件回调函数
 * @param callbacks 回调函数集合
 */
export function setPlayerCallbacks(callbacks: PlayerCallbacks) {
  playerCallbacks = callbacks;
  console.log("[playerService] 播放器回调函数已设置");
}

/**
 * 清除播放器事件回调函数
 */
export function clearPlayerCallbacks() {
  playerCallbacks = {};
  console.log("[playerService] 播放器回调函数已清除");
}

/**
 * 获取当前的播放器事件回调函数
 */
export function getPlayerCallbacks(): PlayerCallbacks {
  return playerCallbacks;
}
