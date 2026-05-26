package chances.android.voice.sdk.util

import android.Manifest
import android.app.Activity
import android.app.Fragment
import android.content.pm.PackageManager
import android.os.Build

object PermissionHelper {
    private const val REQUEST_CODE = 9527
    private const val FRAGMENT_TAG = "VoiceRemotePermissionFragment"

    fun checkAndRequest(activity: Activity, callback: (allGranted: Boolean) -> Unit) {
        if (Build.VERSION.SDK_INT < 23) {
            callback(true)
            return
        }

        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 31) {
            // BLUETOOTH_CONNECT/SCAN 是 API 31 常量，本工程 compileSdk 28 无此符号，
            // 用字面量替代（值与常量一致），仅 API 31+ 运行期生效
            permissions.add("android.permission.BLUETOOTH_CONNECT")
            permissions.add("android.permission.BLUETOOTH_SCAN")
        }

        val needed = permissions.filter {
            activity.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isEmpty()) {
            callback(true)
            return
        }

        val fragment = PermissionFragment()
        fragment.init(needed.toTypedArray(), callback)
        @Suppress("DEPRECATION")
        activity.fragmentManager
            .beginTransaction()
            .add(fragment, FRAGMENT_TAG)
            .commitAllowingStateLoss()
    }

    class PermissionFragment : Fragment() {
        private var permissionsToRequest: Array<String> = emptyArray()
        private var callback: ((Boolean) -> Unit)? = null

        fun init(permissions: Array<String>, callback: (Boolean) -> Unit) {
            this.permissionsToRequest = permissions
            this.callback = callback
        }

        override fun onResume() {
            super.onResume()
            if (Build.VERSION.SDK_INT >= 23) {
                requestPermissions(permissionsToRequest, REQUEST_CODE)
            }
        }

        override fun onRequestPermissionsResult(
            requestCode: Int,
            permissions: Array<out String>,
            grantResults: IntArray
        ) {
            if (requestCode == REQUEST_CODE) {
                val allGranted = grantResults.isNotEmpty() &&
                        grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                callback?.invoke(allGranted)
                callback = null
                @Suppress("DEPRECATION")
                activity?.fragmentManager
                    ?.beginTransaction()
                    ?.remove(this)
                    ?.commitAllowingStateLoss()
            }
        }
    }
}
