import { OTT_NATIVE_KEYDOWN_EVENT } from "@/bridge";

interface FocusableElement {
  focusKey: string;
  element?: HTMLElement; // 新增：存储DOM元素引用
  groupId?: string; // 焦点分组ID，同一组内优先查找
  onFocus?: () => void;
  onBlur?: () => void;
  onEnter?: () => void;
  // 边缘事件：在组内找不到下一个焦点时触发
  onEdgeLeft?: () => boolean; // 返回true表示已处理，不再向外查找
  onEdgeRight?: () => boolean;
  onEdgeUp?: () => boolean;
  onEdgeDown?: () => boolean;
}

interface ElementPosition {
  x: number; // 中心点 x
  y: number; // 中心点 y
  width: number;
  height: number;
  left: number; // 最左边
  right: number; // 最右边
  top: number; // 最上边
  bottom: number; // 最下边
}

class FocusManager {
  private elements: Map<string, FocusableElement> = new Map();
  private positions: Map<string, ElementPosition> = new Map();
  currentFocusKey: string | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private nativeKeydownHandler: ((event: Event) => void) | null = null;
  private positionCacheValid: boolean = false;

  register(focusKey: string, element: FocusableElement) {
    if (!focusKey) {
      return;
    }
    console.log("register", focusKey);
    this.elements.set(focusKey, element);
    this.positionCacheValid = false; // 标记位置缓存需要更新

    // // 如果是第一个元素，自动获得焦点
    // if (this.elements.size === 1 && !this.currentFocusKey) {
    //   this.setFocus(focusKey)
    // }
  }

  unregister(focusKey: string) {
    if (!focusKey) {
      return;
    }
    console.log("unregister", focusKey);
    // if (this.currentFocusKey === focusKey) {
    //   this.blur(focusKey)
    //   this.currentFocusKey = null
    // }
    this.elements.delete(focusKey);
    this.positions.delete(focusKey);
    this.positionCacheValid = false;
  }

  setFocus(focusKey: string, noScroll: boolean = false) {
    const element = this.elements.get(focusKey);
    console.log("setFocus", focusKey, element);
    if (!element) return;
    // 失去当前焦点
    if (this.currentFocusKey && this.currentFocusKey !== focusKey) {
      this.blur(this.currentFocusKey);
    }
    // 设置新焦点
    this.currentFocusKey = focusKey;
    //@ts-ignore
    element.onFocus?.(noScroll);
  }

  blur(focusKey: string) {
    const element = this.elements.get(focusKey);
    element?.onBlur?.();
  }

  /**
   * 更新所有元素的位置缓存
   * 性能优化：只在缓存失效时重新计算
   */
  private updatePositions() {
    if (this.positionCacheValid) return;

    this.positions.clear();

    this.elements.forEach((element, key) => {
      const domElement = document.querySelector(
        `[data-focus-key="${key}"]`
      ) as HTMLElement;
      if (domElement) {
        const rect = domElement.getBoundingClientRect();
        this.positions.set(key, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        });
      }
    });

    // this.positionCacheValid = true
  }

  /**
   * 在指定方向上查找最近的可聚焦元素
   * @param direction 'left' | 'right' | 'up' | 'down'
   * @param searchInGroup 是否仅在当前组内查找
   */
  private findNearestInDirection(
    direction: "left" | "right" | "up" | "down",
    searchInGroup = true
  ): string | null {
    if (!this.currentFocusKey) return null;

    this.updatePositions();

    const currentPos = this.positions.get(this.currentFocusKey);
    if (!currentPos) return null;

    const currentElement = this.elements.get(this.currentFocusKey);
    const currentGroupId = currentElement?.groupId;

    let bestKey: string | null = null;
    let bestDistance = Infinity;

    this.positions.forEach((pos, key) => {
      if (key === this.currentFocusKey) return;

      const element = this.elements.get(key);

      // 如果需要在组内查找，且当前元素有groupId，则只查找同组元素
      if (
        searchInGroup &&
        currentGroupId &&
        element?.groupId !== currentGroupId
      ) {
        return;
      }

      const deltaX = pos.x - currentPos.x;
      const deltaY = pos.y - currentPos.y;

      // 判断是否在正确的方向上，使用边界判断
      let isInDirection = false;
      switch (direction) {
        case "right":
          // 下一个元素的最右边要在当前元素的最右边的右侧
          isInDirection = pos.right > currentPos.right;
          break;
        case "left":
          // 下一个元素的最左边要在当前元素的最左边的左侧
          isInDirection = pos.left < currentPos.left;
          break;
        case "down":
          // 下一个元素的最下边要在当前元素的最下边的下方
          isInDirection = pos.bottom > currentPos.bottom;
          break;
        case "up":
          // 下一个元素的最上边要在当前元素的最上边的上方
          isInDirection = pos.top < currentPos.top;
          break;
      }

      if (!isInDirection) return;

      // 计算加权距离
      let distance: number;

      if (direction === "left" || direction === "right") {
        // 水平导航：横向距离权重高
        distance = Math.sqrt(
          Math.pow(Math.abs(deltaX) * 1.5, 2) + Math.pow(Math.abs(deltaY), 2)
        );
      } else {
        // 垂直导航：纵向距离权重高
        distance = Math.sqrt(
          Math.pow(Math.abs(deltaX), 2) + Math.pow(Math.abs(deltaY) * 1.5, 2)
        );
      }

      // 添加方向偏离惩罚
      if (direction === "left" || direction === "right") {
        // 水平导航时，如果垂直偏移太大，增加惩罚
        const verticalDeviation = Math.abs(deltaY) / Math.abs(deltaX);
        distance *= 1 + verticalDeviation * 0.5;
      } else {
        // 垂直导航时，如果水平偏移太大，增加惩罚
        const horizontalDeviation = Math.abs(deltaX) / Math.abs(deltaY);
        distance *= 1 + horizontalDeviation * 0.5;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestKey = key;
      }
    });

    return bestKey;
  }

  /**
   * 通用导航方法
   * 1. 先在组内查找
   * 2. 如果找不到，触发边缘事件
   * 3. 如果边缘事件未处理或返回false，则在全局查找
   */
  private navigate(direction: "left" | "right" | "up" | "down") {
    if (!this.currentFocusKey) return;

    const currentElement = this.elements.get(this.currentFocusKey);
    const hasGroup = !!currentElement?.groupId;

    // 1. 先在组内查找（如果有分组）
    let nextKey = hasGroup
      ? this.findNearestInDirection(direction, true)
      : null;

    // 2. 如果组内找不到，触发边缘事件
    if (!nextKey && hasGroup && currentElement) {
      let edgeHandled = false;

      switch (direction) {
        case "left":
          edgeHandled = currentElement.onEdgeLeft?.() ?? false;
          break;
        case "right":
          edgeHandled = currentElement.onEdgeRight?.() ?? false;
          break;
        case "up":
          edgeHandled = currentElement.onEdgeUp?.() ?? false;
          break;
        case "down":
          edgeHandled = currentElement.onEdgeDown?.() ?? false;
          break;
      }

      // 如果边缘事件已处理，直接返回
      if (edgeHandled) {
        console.log(
          `[FocusManager] Edge ${direction} handled by group ${currentElement.groupId}`
        );
        return;
      }
    }

    // 3. 如果没有分组或边缘事件未处理，在全局查找
    if (!nextKey) {
      nextKey = this.findNearestInDirection(direction, false);
    }

    // 4. 移动焦点
    if (nextKey) {
      this.setFocus(nextKey);
    }
  }

  private navigateToNext() {
    this.navigate("down");
  }

  private navigateToPrevious() {
    this.navigate("up");
  }

  private navigateToRight() {
    this.navigate("right");
  }

  private navigateToLeft() {
    this.navigate("left");
  }

  private handleEnter() {
    if (!this.currentFocusKey) return;
    const element = this.elements.get(this.currentFocusKey);
    element?.onEnter?.();
  }

  private handleNavigationKey(key: string, e?: KeyboardEvent) {
    switch (key) {
      case "ArrowRight":
        e?.preventDefault();
        this.navigateToRight();
        break;
      case "ArrowLeft":
        e?.preventDefault();
        this.navigateToLeft();
        break;
      case "ArrowDown":
        e?.preventDefault();
        this.navigateToNext();
        break;
      case "ArrowUp":
        e?.preventDefault();
        this.navigateToPrevious();
        break;
      case "Enter":
        e?.preventDefault();
        this.handleEnter();
        break;
    }
  }

  init() {
    this.keydownHandler = (e: KeyboardEvent) => {
      console.log("[FocusManager] keydown", e.key);
      this.handleNavigationKey(e.key, e);
    };

    this.nativeKeydownHandler = (event: Event) => {
      const nativeEvent = event as CustomEvent<{
        keyCode: number;
        keyCodeString: string;
        key: string;
      }>;
      const detail = nativeEvent.detail;
      if (!detail || !detail.key) {
        return;
      }
      console.log(
        "[FocusManager] nativeKeydown",
        detail.keyCode,
        detail.keyCodeString,
        detail.key
      );
      this.handleNavigationKey(detail.key);
    };

    if ((window as any).ottService) {
      // 基座环境监听桥接层统一派发的原生按键事件
      window.addEventListener(OTT_NATIVE_KEYDOWN_EVENT, this.nativeKeydownHandler);
    } else {
      window.addEventListener("keydown", this.keydownHandler);
    }

    // 监听窗口大小变化，使缓存失效
    window.addEventListener("resize", () => {
      this.positionCacheValid = false;
    });

    // 监听滚动事件，使缓存失效
    window.addEventListener(
      "scroll",
      () => {
        this.positionCacheValid = false;
      },
      true
    );
  }

  destroy() {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.nativeKeydownHandler) {
      window.removeEventListener(
        OTT_NATIVE_KEYDOWN_EVENT,
        this.nativeKeydownHandler
      );
    }
    this.nativeKeydownHandler = null;
    this.elements.clear();
    this.positions.clear();
    this.currentFocusKey = null;
  }
}

const focusManager = new FocusManager();

export function useFocusManager() {
  const initFocusManager = () => {
    focusManager.init();
  };

  const destroyFocusManager = () => {
    focusManager.destroy();
  };

  return {
    initFocusManager,
    destroyFocusManager,
  };
}

export function useFocusable() {
  const register = (
    focusKey: string,
    callbacks: Omit<FocusableElement, "focusKey">
  ) => {
    focusManager.register(focusKey, { focusKey, ...callbacks });
  };

  const unregister = (focusKey: string) => {
    focusManager.unregister(focusKey);
  };

  const setFocus = (focusKey: string, noScroll: boolean = false) => {
    focusManager.setFocus(focusKey, noScroll);
  };

  const getCurrentFocusKey = () => {
    return focusManager.currentFocusKey;
  };

  return {
    getCurrentFocusKey,
    register,
    unregister,
    setFocus,
  };
}
