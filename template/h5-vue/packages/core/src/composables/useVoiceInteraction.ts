import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { setVoiceCallbacks, clearVoiceCallbacks } from '../bridge/ottservice'
import { navigateToAIChat } from '../navigation/navigation'

/**
 * 语音交互管理
 * 管理全局语音弹框的显示和语音事件处理
 */
export function useVoiceInteraction() {
  const router = useRouter()
  const route = useRoute()
  
  // 语音弹框状态
  const voiceDialogVisible = ref(false)
  const voiceText = ref('')
  let closeTimer: number | null = null

  /**
   * 开始语音识别
   */
  const handleBeginSpeech = () => {
    console.log('[VoiceInteraction] 开始语音识别')
    
    // 清除之前的关闭定时器
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    
    voiceText.value = ''
    voiceDialogVisible.value = true
  }

  /**
   * 结束语音识别
   */
  const handleEndSpeech = () => {
    console.log('[VoiceInteraction] 结束语音识别')
    
    // 延迟100ms关闭弹框，让用户看到最后的识别结果
    closeTimer = window.setTimeout(() => {
      voiceDialogVisible.value = false
      voiceText.value = ''
      closeTimer = null
    }, 1000)
  }

  /**
   * 动态识别结果（实时更新）
   */
  const handleDynamicResult = (result: string) => {
    console.log('[VoiceInteraction] 动态识别结果:', result)
    voiceText.value = result
  }

  /**
   * 最终识别结果，跳转到 AI 交互页面
   */
  const handleFinalResult = (result: string) => {
    const normalizedResult = (result || '').trim()
    if (!normalizedResult) {
      console.log('[VoiceInteraction] 最终识别结果为空，不执行跳转')
      return
    }
    console.log('[VoiceInteraction] 最终识别结果，准备跳转到AI交互页面:', normalizedResult)
    navigateToAIChat(router, route, normalizedResult)
  }

  /**
   * 识别错误
   */
  const handleError = (error: string) => {
    console.error('[VoiceInteraction] 语音识别错误:', error)
    
    // 立即关闭弹框
    voiceDialogVisible.value = false
    voiceText.value = ''
    
    // 清除定时器
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  /**
   * 清除定时器
   */
  const clearTimer = () => {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  /**
   * 初始化语音回调
   */
  const initVoiceCallbacks = () => {
    setVoiceCallbacks({
      onBeginSpeech: handleBeginSpeech,
      onEndSpeech: handleEndSpeech,
      onDynamicResult: handleDynamicResult,
      onFinalResult: handleFinalResult,
      onError: handleError
    })
    console.log('[VoiceInteraction] 语音识别回调已注册')
  }

  /**
   * 清除语音回调
   */
  const destroyVoiceCallbacks = () => {
    clearVoiceCallbacks()
    clearTimer()
    console.log('[VoiceInteraction] 语音识别回调已清除')
  }

  // 生命周期钩子
  onMounted(() => {
    initVoiceCallbacks()
  })

  onUnmounted(() => {
    destroyVoiceCallbacks()
  })

  return {
    // 状态
    voiceDialogVisible,
    voiceText,
    
    // 方法（供外部手动调用，如果需要）
    initVoiceCallbacks,
    destroyVoiceCallbacks
  }
}
