package com.chances.shell.launcher

import chances.core.arc.BaseActivity
import chances.core.log.Logger
import chances.core.permission.Permission
import chances.core.permission.PermissionHelper
import com.chances.shell.R
import com.chances.shell.web.WebActivity

/**
 * 应用统一入口（管理中心）。
 *
 * 作为 LAUNCHER 入口集中处理启动事务：申请 sdcard 读写权限（[WebActivity] 据此决定是否走 sdcard
 * 通道，见其文档），随后跳转 [WebActivity] 并 finish 自身，使返回键不回到本页。
 * 后续需要的全局初始化 / 多入口路由可在此扩展，业务页保持单一职责。
 *
 * 权限被拒 / 异常时**不阻断**：仍进入 [WebActivity]，仅降级为不读写 sdcard。
 *
 * 入口：系统桌面图标启动；可选透传 [WebActivity.EXTRA_URL] 给业务页。
 *
 * @author template
 */
class LauncherActivity : BaseActivity() {

    companion object {
        private const val TAG = "LauncherActivity"
    }

    override fun getLayoutId(): Int = R.layout.activity_launcher

    override fun initView() {
        // 纯路由页，无交互视图
    }

    override fun initData() {
        requestStorageThenLaunch()
    }

    /**
     * 申请 `READ/WRITE_EXTERNAL_STORAGE` 后跳转 [WebActivity]。
     *
     * 已授权（API < 23 静态授权或用户先前已同意）直接跳转，免弹框打扰；
     * 被拒 / 异常一律降级跳转，由 [WebActivity] 自行兜底。
     */
    private fun requestStorageThenLaunch() {
        if (PermissionHelper.isGranted(
                this,
                Permission.READ_EXTERNAL_STORAGE,
                Permission.WRITE_EXTERNAL_STORAGE
            )
        ) {
            launchWeb()
            return
        }
        PermissionHelper.with(this)
            .request(Permission.READ_EXTERNAL_STORAGE, Permission.WRITE_EXTERNAL_STORAGE)
            .onGranted { granted ->
                Logger.d(TAG, "存储权限已授权: $granted")
                launchWeb()
            }
            .onDenied { denied, neverAskAgain ->
                Logger.w(TAG, "存储权限被拒: $denied, neverAskAgain=$neverAskAgain，降级进入 WebActivity")
                launchWeb()
            }
            .onError { e ->
                Logger.e(TAG, "存储权限请求异常，降级进入 WebActivity: $e")
                launchWeb()
            }
            .start()
    }

    /**
     * 跳转 [WebActivity] 并结束自身。透传本页 [WebActivity.EXTRA_URL]（若外部启动时带入）。
     */
    private fun launchWeb() {
        val url = intent.getStringExtra(WebActivity.EXTRA_URL)
        startActivity(WebActivity.newIntent(this, url))
        finish()
    }
}
