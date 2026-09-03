package chances.android.voice.sdk.core

import android.bluetooth.BluetoothDevice

sealed class VoiceError(val message: String) {
    class PermissionDenied(msg: String) : VoiceError(msg)
    class NoRemoteConnected(msg: String) : VoiceError(msg)
    class AsrFailed(msg: String) : VoiceError(msg)
    class NetworkError(msg: String) : VoiceError(msg)
}

interface VoiceRemoteCallback {
    fun onListeningStart()
    fun onPartialResult(text: String) {}
    fun onFinalResult(text: String)
    fun onListeningStop()
    fun onError(error: VoiceError)
    fun onRemoteConnected(device: BluetoothDevice) {}
    fun onRemoteDisconnected(device: BluetoothDevice) {}
    fun onEngineFallback(type: String, from: String, to: String) {}
    fun onRemoteKeyEvent(key: String) {}
}
