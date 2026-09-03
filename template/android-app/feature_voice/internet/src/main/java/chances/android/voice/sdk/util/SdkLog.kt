package chances.android.voice.sdk.util

import android.util.Log

/**
 * SDK-wide logger that mirrors to both Android logcat and an optional external listener.
 * Set [listener] to receive log lines in the app (e.g. display in UI).
 */
object SdkLog {

    var listener: ((level: String, tag: String, msg: String) -> Unit)? = null

    fun d(tag: String, msg: String) {
        Log.d(tag, msg)
        listener?.invoke("D", tag, msg)
    }

    fun i(tag: String, msg: String) {
        Log.i(tag, msg)
        listener?.invoke("I", tag, msg)
    }

    fun w(tag: String, msg: String) {
        Log.w(tag, msg)
        listener?.invoke("W", tag, msg)
    }

    fun e(tag: String, msg: String) {
        Log.e(tag, msg)
        listener?.invoke("E", tag, msg)
    }

    fun e(tag: String, msg: String, t: Throwable) {
        Log.e(tag, msg, t)
        listener?.invoke("E", tag, "$msg: ${t.message}")
    }
}
