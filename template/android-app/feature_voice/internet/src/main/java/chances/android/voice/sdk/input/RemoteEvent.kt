package chances.android.voice.sdk.input

import android.bluetooth.BluetoothDevice

sealed class RemoteEvent {
    data class Connected(val device: BluetoothDevice) : RemoteEvent()
    data class Disconnected(val device: BluetoothDevice) : RemoteEvent()
    object VoiceKeyDown : RemoteEvent()
    object VoiceKeyUp : RemoteEvent()
    data class AudioChunk(val pcmData: ByteArray) : RemoteEvent()
}
