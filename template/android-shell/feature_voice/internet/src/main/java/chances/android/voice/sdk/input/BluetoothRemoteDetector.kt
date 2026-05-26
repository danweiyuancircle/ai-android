package chances.android.voice.sdk.input

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.ParcelUuid
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.VoiceRemoteConfig

class BluetoothRemoteDetector(
    private val context: Context,
    private val config: VoiceRemoteConfig,
    private val listener: (RemoteEvent) -> Unit
) {
    companion object {
        private const val TAG = "BTRemoteDetector"
        private val HID_UUID = ParcelUuid.fromString("00001124-0000-1000-8000-00805f9b34fb")
    }

    private var activeCapture: AudioCaptureBase? = null
    private var activeDevice: BluetoothDevice? = null

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val device: BluetoothDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                ?: return
            when (intent.action) {
                BluetoothDevice.ACTION_ACL_CONNECTED -> onDeviceConnected(device)
                BluetoothDevice.ACTION_ACL_DISCONNECTED -> onDeviceDisconnected(device)
            }
        }
    }

    fun start() {
        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
            addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
        }
        context.registerReceiver(receiver, filter)
        SdkLog.d(TAG, "Started listening for BT connections")

        // Check already-connected devices
        checkAlreadyConnectedDevices()
    }

    @SuppressLint("MissingPermission")
    private fun checkAlreadyConnectedDevices() {
        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
                ?: return
            val adapter = bluetoothManager.adapter ?: return
            val bondedDevices = adapter.bondedDevices ?: return

            // Log all bonded devices
            for (device in bondedDevices) {
                SdkLog.d(TAG, "Bonded device: ${device.name} (${device.address}) type=${device.type}")
            }

            // Prefer: devices with RCU/Remote in name, or BLE type (type=2), or HID profile
            val sorted = bondedDevices.sortedWith(compareByDescending<BluetoothDevice> { dev ->
                val name = dev.name?.uppercase() ?: ""
                when {
                    name.contains("RCU") || name.contains("REMOTE") || name.contains("VOICE") -> 3
                    isHidDevice(dev) -> 2
                    dev.type == BluetoothDevice.DEVICE_TYPE_LE -> 1
                    else -> 0
                }
            })

            for (device in sorted) {
                if (activeDevice != null) break
                SdkLog.i(TAG, "Trying bonded device: ${device.name} (${device.address})")
                onDeviceConnected(device)
            }
        } catch (e: Exception) {
            SdkLog.w(TAG, "Failed to check connected devices: ${e.message}")
        }
    }

    fun stop() {
        try {
            context.unregisterReceiver(receiver)
        } catch (_: IllegalArgumentException) {}
        releaseCapture()
    }

    fun getActiveCapture(): AudioCaptureBase? = activeCapture

    @SuppressLint("MissingPermission")
    private fun onDeviceConnected(device: BluetoothDevice) {
        SdkLog.i(TAG, "Device connected: ${device.name} (${device.address})")
        listener(RemoteEvent.Connected(device))

        activeDevice = device
        activeCapture = if (isHidDevice(device)) {
            SdkLog.i(TAG, "Creating HidAudioCapture (HID device detected)")
            val skipAudio = config.asrMode == VoiceRemoteConfig.AsrMode.SYSTEM
            HidAudioCapture(device, skipAudio)
        } else if (config.gattProfile != null) {
            SdkLog.i(TAG, "Creating GattAudioCapture (GATT profile configured)")
            GattAudioCapture(context, device, config.gattProfile)
        } else {
            SdkLog.i(TAG, "Creating GattAudioCapture in discovery mode")
            GattAudioCapture(context, device, null)
        }
        activeCapture?.start(listener)
    }

    @SuppressLint("MissingPermission")
    private fun onDeviceDisconnected(device: BluetoothDevice) {
        if (device.address == activeDevice?.address) {
            SdkLog.i(TAG, "Active device disconnected: ${device.name}")
            releaseCapture()
            activeDevice = null
            listener(RemoteEvent.Disconnected(device))
        }
    }

    private fun isHidDevice(device: BluetoothDevice): Boolean {
        return try {
            device.uuids?.any { it == HID_UUID } ?: false
        } catch (e: SecurityException) {
            SdkLog.w(TAG, "Cannot read device UUIDs: ${e.message}")
            false
        }
    }

    private fun releaseCapture() {
        activeCapture?.release()
        activeCapture = null
    }
}
