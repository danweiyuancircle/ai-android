package chances.android.voice.sdk.input

import android.annotation.SuppressLint
import android.annotation.TargetApi
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Build
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.AudioCodec
import chances.android.voice.sdk.core.GattAudioProfile
import chances.android.voice.sdk.util.AdpcmDecoder
import java.util.LinkedList
import java.util.UUID

@SuppressLint("MissingPermission")
@TargetApi(18)
class GattAudioCapture(
    private val context: Context,
    private val device: BluetoothDevice,
    private val profile: GattAudioProfile?
) : AudioCaptureBase() {

    companion object {
        private const val TAG = "GattAudioCapture"
        private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private val HID_SERVICE_UUID = UUID.fromString("00001812-0000-1000-8000-00805f9b34fb")
        private val HID_REPORT_UUID = UUID.fromString("00002a4d-0000-1000-8000-00805f9b34fb")
        // Well-known BLE service UUIDs to skip when auto-detecting audio
        private val STANDARD_SERVICE_UUIDS = setOf(
            "00001800", "00001801", "0000180a", "0000180f", "00001812" // GAP, GATT, DeviceInfo, Battery, HID
        )
    }

    private var gatt: BluetoothGatt? = null
    @Volatile
    private var isVoiceActive = false
    // Queue for enabling notifications one by one (GATT only allows one pending operation)
    private val notifyQueue = LinkedList<BluetoothGattCharacteristic>()
    private var audioCharUuid: UUID? = null
    @Volatile
    private var lastAudioTime: Long = 0

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                SdkLog.i(TAG, "GATT connected, discovering services")
                gatt.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                SdkLog.i(TAG, "GATT disconnected")
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                SdkLog.e(TAG, "Service discovery failed: $status")
                return
            }
            logAllServices(gatt)
            if (profile != null) {
                subscribeToAudio(gatt)
            } else {
                autoDetectAndSubscribe(gatt)
            }
        }

        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic
        ) {
            val uuid = characteristic.uuid
            val raw = characteristic.value ?: return

            when {
                // HID Report — detect voice key press/release
                uuid == HID_REPORT_UUID -> handleHidReport(raw)
                // Audio data from configured or auto-detected audio characteristic
                uuid == audioCharUuid || (profile != null && uuid.toString() == profile.audioCharUuid) -> {
                    // Auto-detect voice start: first audio packet = voice key down
                    if (!isVoiceActive) {
                        isVoiceActive = true
                        SdkLog.i(TAG, "Voice started (audio data received, ${raw.size} bytes)")
                        listener?.invoke(RemoteEvent.VoiceKeyDown)
                    }
                    val pcm = when (profile?.audioCodec) {
                        AudioCodec.ADPCM -> AdpcmDecoder.decode(raw)
                        AudioCodec.PCM, AudioCodec.OPUS, null -> raw
                    }
                    listener?.invoke(RemoteEvent.AudioChunk(pcm))
                    // Reset silence timer
                    lastAudioTime = System.currentTimeMillis()
                }
                else -> {
                    // Log unknown notifications for debugging
                    SdkLog.d(TAG, "Notify from ${uuid}: ${raw.size} bytes")
                }
            }

        }

        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                SdkLog.d(TAG, "Notification enabled for ${descriptor.characteristic.uuid}")
            } else {
                SdkLog.w(TAG, "Failed to enable notification for ${descriptor.characteristic.uuid}: $status")
            }
            // Process next in queue
            enableNextNotification(gatt)
        }
    }

    private fun handleHidReport(data: ByteArray) {
        // HID Report data varies by device. Common pattern:
        // Voice key press: a specific byte pattern (non-zero)
        // Voice key release: all zeros or different pattern
        // We detect transitions: any non-zero report after zeros = key down, all zeros after non-zero = key up
        val hasData = data.any { it != 0.toByte() }

        if (hasData && !isVoiceActive) {
            isVoiceActive = true
            SdkLog.i(TAG, "Voice key DOWN detected (HID Report: ${data.joinToString(",") { "%02x".format(it) }})")
            listener?.invoke(RemoteEvent.VoiceKeyDown)
        } else if (!hasData && isVoiceActive) {
            isVoiceActive = false
            SdkLog.i(TAG, "Voice key UP detected")
            listener?.invoke(RemoteEvent.VoiceKeyUp)
        }
    }

    /**
     * Auto-detect: subscribe to all HID Report NOTIFY characteristics (for key detection)
     * and the first non-standard NOTIFY characteristic (likely audio).
     */
    private fun autoDetectAndSubscribe(gatt: BluetoothGatt) {
        SdkLog.i(TAG, "Auto-detecting audio and HID characteristics...")

        // 1. FIRST: Find vendor-specific audio service (priority — must not be blocked by HID)
        for (service in gatt.services) {
            val uuidPrefix = service.uuid.toString().substring(0, 8)
            if (uuidPrefix in STANDARD_SERVICE_UUIDS) continue

            for (char in service.characteristics) {
                if (char.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
                    if (audioCharUuid == null) {
                        audioCharUuid = char.uuid
                        SdkLog.i(TAG, "Auto-detected audio characteristic: ${char.uuid} in service ${service.uuid}")
                    }
                    notifyQueue.add(char)
                    SdkLog.i(TAG, "Queued vendor NOTIFY for subscription: ${char.uuid}")
                }
            }
        }

        // 2. THEN: Try HID Report characteristics (may fail if system owns them — that's OK)
        val hidService = gatt.getService(HID_SERVICE_UUID)
        if (hidService != null) {
            for (char in hidService.characteristics) {
                if (char.uuid == HID_REPORT_UUID &&
                    char.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0
                ) {
                    notifyQueue.add(char)
                    SdkLog.i(TAG, "Queued HID Report for notification: ${char.uuid}")
                }
            }
        }

        // Start enabling notifications one by one
        enableNextNotification(gatt)
    }

    private fun subscribeToAudio(gatt: BluetoothGatt) {
        val service = gatt.getService(UUID.fromString(profile!!.serviceUuid))
        if (service == null) {
            SdkLog.e(TAG, "Service not found: ${profile.serviceUuid}")
            return
        }

        profile.controlCharUuid?.let { uuid ->
            val controlChar = service.getCharacteristic(UUID.fromString(uuid))
            if (controlChar != null) {
                controlChar.value = byteArrayOf(0x01)
                gatt.writeCharacteristic(controlChar)
                SdkLog.i(TAG, "Wrote control command to enable mic")
            }
        }

        val audioChar = service.getCharacteristic(UUID.fromString(profile.audioCharUuid))
        if (audioChar == null) {
            SdkLog.e(TAG, "Audio characteristic not found: ${profile.audioCharUuid}")
            return
        }
        audioCharUuid = audioChar.uuid
        notifyQueue.add(audioChar)

        // Also subscribe to HID Reports if available
        val hidService = gatt.getService(HID_SERVICE_UUID)
        if (hidService != null) {
            for (char in hidService.characteristics) {
                if (char.uuid == HID_REPORT_UUID &&
                    char.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0
                ) {
                    notifyQueue.add(char)
                }
            }
        }

        enableNextNotification(gatt)
    }

    private fun enableNextNotification(gatt: BluetoothGatt) {
        val char = notifyQueue.poll() ?: run {
            SdkLog.i(TAG, "All notifications enabled, trying audio start command...")
            tryWriteAudioStartCommand(gatt)
            return
        }
        try {
            gatt.setCharacteristicNotification(char, true)
        } catch (e: SecurityException) {
            SdkLog.w(TAG, "SecurityException for ${char.uuid}, skipping (system-owned HID?)")
            enableNextNotification(gatt)
            return
        }
        val descriptor = char.getDescriptor(CCCD_UUID)
        if (descriptor != null) {
            descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
            val success = try {
                gatt.writeDescriptor(descriptor)
            } catch (e: SecurityException) {
                SdkLog.w(TAG, "SecurityException writing CCCD for ${char.uuid}, skipping")
                false
            }
            if (!success) {
                SdkLog.w(TAG, "writeDescriptor failed for ${char.uuid}, retrying after delay...")
                // Delay and retry once — GATT might be busy with previous operation
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    val retry = try { gatt.writeDescriptor(descriptor) } catch (_: Exception) { false }
                    if (!retry) {
                        SdkLog.w(TAG, "writeDescriptor retry failed for ${char.uuid}, skipping")
                        enableNextNotification(gatt)
                    }
                }, 500)
                return
            }
            // Timeout: if onDescriptorWrite never fires, move on after 2s
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                if (notifyQueue.isNotEmpty()) {
                    SdkLog.w(TAG, "Descriptor write timeout for ${char.uuid}, moving on")
                    enableNextNotification(gatt)
                }
            }, 2000)
        } else {
            SdkLog.w(TAG, "No CCCD for ${char.uuid}, skipping")
            enableNextNotification(gatt)
        }
    }

    private val NANOSIC_AUDIO_SERVICE = UUID.fromString("76726573-6f69-6475-6163-69736f6e616e")
    private val NANOSIC_AUDIO_OUT = UUID.fromString("5f74756f-6f69-6475-6163-69736f6e616e")

    private fun tryWriteAudioStartCommand(gatt: BluetoothGatt) {
        val audioService = gatt.getService(NANOSIC_AUDIO_SERVICE)
        if (audioService == null) {
            SdkLog.d(TAG, "No nanosic audio service found")
            return
        }
        val audioOut = audioService.getCharacteristic(NANOSIC_AUDIO_OUT)
        if (audioOut == null) {
            SdkLog.d(TAG, "No nanosic audio_out characteristic found")
            return
        }

        // Try a simple start command
        try {
            audioOut.value = byteArrayOf(0x01)
            val ok = gatt.writeCharacteristic(audioOut)
            SdkLog.i(TAG, "Wrote audio start command (0x01): $ok")
        } catch (e: Exception) {
            SdkLog.w(TAG, "Failed to write start command: ${e.message}")
        }
    }

    private fun logAllServices(gatt: BluetoothGatt) {
        SdkLog.i(TAG, "=== GATT Discovery Mode ===")
        SdkLog.i(TAG, "Device: ${device.name} (${device.address})")
        for (service in gatt.services) {
            SdkLog.i(TAG, "Service: ${service.uuid}")
            for (char in service.characteristics) {
                val props = char.properties
                val propsStr = buildString {
                    if (props and BluetoothGattCharacteristic.PROPERTY_READ != 0) append("READ ")
                    if (props and BluetoothGattCharacteristic.PROPERTY_WRITE != 0) append("WRITE ")
                    if (props and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) append("NOTIFY ")
                    if (props and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0) append("INDICATE ")
                }
                SdkLog.i(TAG, "  Char: ${char.uuid} [$propsStr]")
            }
        }
        SdkLog.i(TAG, "=== End Discovery ===")
    }

    override fun onStart() {
        if (Build.VERSION.SDK_INT >= 23) {
            gatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        } else {
            gatt = device.connectGatt(context, false, gattCallback)
        }
        // Start silence watchdog
        startSilenceWatchdog()
    }

    private fun startSilenceWatchdog() {
        Thread {
            while (gatt != null) {
                Thread.sleep(200)
                if (isVoiceActive && lastAudioTime > 0 &&
                    System.currentTimeMillis() - lastAudioTime > 500
                ) {
                    isVoiceActive = false
                    lastAudioTime = 0
                    SdkLog.i(TAG, "Voice stopped (silence detected)")
                    listener?.invoke(RemoteEvent.VoiceKeyUp)
                }
            }
        }.apply {
            name = "GattSilenceWatchdog"
            isDaemon = true
            start()
        }
    }

    override fun onStop() {
        isVoiceActive = false
        gatt?.disconnect()
    }

    override fun onRelease() {
        gatt?.close()
        gatt = null
    }
}
