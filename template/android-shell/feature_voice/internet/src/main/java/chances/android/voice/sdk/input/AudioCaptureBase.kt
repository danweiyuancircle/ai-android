package chances.android.voice.sdk.input

abstract class AudioCaptureBase {
    protected var listener: ((RemoteEvent) -> Unit)? = null

    fun start(listener: (RemoteEvent) -> Unit) {
        this.listener = listener
        onStart()
    }

    fun stop() {
        onStop()
    }

    fun release() {
        onRelease()
        listener = null
    }

    protected abstract fun onStart()
    protected abstract fun onStop()
    protected abstract fun onRelease()
}
