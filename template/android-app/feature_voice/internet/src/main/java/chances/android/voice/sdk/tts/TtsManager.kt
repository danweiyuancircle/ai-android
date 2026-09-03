package chances.android.voice.sdk.tts

import java.util.LinkedList

class TtsManager(private val engine: TtsEngine) {

    enum class InterruptMode { INTERRUPT, QUEUE, IGNORE }

    private data class TtsTask(val text: String, val onDone: (() -> Unit)?)

    private val queue = LinkedList<TtsTask>()
    @Volatile
    private var isSpeaking = false

    fun speak(
        text: String,
        mode: InterruptMode = InterruptMode.INTERRUPT,
        onDone: (() -> Unit)? = null
    ) {
        when (mode) {
            InterruptMode.INTERRUPT -> {
                queue.clear()
                if (isSpeaking) engine.stop()
                isSpeaking = false
                playNow(TtsTask(text, onDone))
            }
            InterruptMode.QUEUE -> {
                if (isSpeaking) {
                    queue.add(TtsTask(text, onDone))
                } else {
                    playNow(TtsTask(text, onDone))
                }
            }
            InterruptMode.IGNORE -> {
                if (!isSpeaking) {
                    playNow(TtsTask(text, onDone))
                }
            }
        }
    }

    fun stop() {
        queue.clear()
        engine.stop()
        isSpeaking = false
    }

    private fun playNow(task: TtsTask) {
        isSpeaking = true
        engine.speak(task.text) {
            task.onDone?.invoke()
            isSpeaking = false
            playNext()
        }
    }

    private fun playNext() {
        val next = queue.poll() ?: return
        playNow(next)
    }
}
