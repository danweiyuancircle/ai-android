package com.chances.shell.web

import android.content.Context
import android.support.v4.content.ContextCompat
import android.support.v7.widget.AppCompatButton
import android.support.v7.widget.AppCompatEditText
import android.support.v7.widget.AppCompatTextView
import android.text.TextUtils
import android.widget.Toast
import chances.core.arc.BaseDialog
import com.chances.shell.R

/**
 * [WebActivity] 的 webUrl 设置弹框。
 *
 * 弹框依次展示：**当前正在加载的 url + 来源 + sdcard 配置文件路径 + 文件格式说明 + 修改输入框**；
 * 让调试人员既能看到当下加载的是哪个 url、是否命中 sdcard 配置，也能直接定位 sdcard 文件位置
 * 用文件管理器 / adb pull 手动维护。点击保存后通过 [onSaveListener] 把新 url 抛给宿主，
 * 由宿主决定如何落盘 + 重新加载；本弹框不直接持有任何 IO 与 WebView 引用，职责单一。
 *
 * 关闭策略：沿用 [BaseDialog] 的 AppCompatDialog 默认行为（可取消、点外部关闭、Back 关闭）。
 *
 * 入口：仅由 [WebActivity] 在连按 5 次菜单键后构造并 [show]。
 *
 * @property currentUrl     弹框打开时正在加载的 url，会预填到 EditText 并展示在顶部；空字符串展示占位文案
 * @property source         [currentUrl] 的来源标识，用于决定"当前来源"行的文案与颜色
 * @property sdcardPath     sdcard 配置文件的绝对路径（如 `/sdcard/web_url.txt`），只读展示
 * @property onSaveListener 保存按钮回调；入参为 trim 后的新 url（保证非空），回调返回后弹框自动 dismiss
 */
class WebUrlDialog(
    context: Context,
    private val currentUrl: String,
    private val source: WebUrlSource,
    private val sdcardPath: String,
    private val onSaveListener: OnSaveListener
) : BaseDialog(context) {

    private lateinit var tvCurrentUrl: AppCompatTextView
    private lateinit var tvSource: AppCompatTextView
    private lateinit var tvSdcardPath: AppCompatTextView
    private lateinit var etUrl: AppCompatEditText
    private lateinit var btnSave: AppCompatButton
    private lateinit var btnCancel: AppCompatButton

    override fun getLayoutId(): Int = R.layout.dialog_web_url

    override fun initView() {
        tvCurrentUrl = findViewById(R.id.tv_web_dialog_current_url)!!
        tvSource = findViewById(R.id.tv_web_dialog_source)!!
        tvSdcardPath = findViewById(R.id.tv_web_dialog_sdcard_path)!!
        etUrl = findViewById(R.id.et_web_dialog_url)!!
        btnSave = findViewById(R.id.btn_web_dialog_save)!!
        btnCancel = findViewById(R.id.btn_web_dialog_cancel)!!

        btnCancel.setOnClickListener {
            dismiss()
        }
        btnSave.setOnClickListener {
            val newUrl = etUrl.text?.toString()?.trim().orEmpty()
            if (TextUtils.isEmpty(newUrl)) {
                Toast.makeText(context, R.string.web_dialog_url_invalid, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            onSaveListener.onSave(newUrl)
            dismiss()
        }
    }

    override fun initData() {
        if (TextUtils.isEmpty(currentUrl)) {
            tvCurrentUrl.setText(R.string.web_dialog_current_empty)
        } else {
            tvCurrentUrl.text = currentUrl
            etUrl.setText(currentUrl)
            etUrl.setSelection(currentUrl.length)
        }

        renderSource()
        tvSdcardPath.text = sdcardPath

        // 弹框打开即把焦点落到输入框（TV d-pad 下唯一应初始获焦的控件），方便遥控器直接编辑
        etUrl.requestFocus()
    }

    /**
     * 按 [source] 渲染"当前来源"行：命中 sdcard 走绿色高亮，其它来源走橙色弱化提示。
     *
     * 文案全部走 strings.xml，颜色复用 colors.xml，符合资源化约束。
     */
    private fun renderSource() {
        val textRes: Int
        val colorRes: Int
        when (source) {
            WebUrlSource.SDCARD -> {
                textRes = R.string.web_dialog_source_sdcard
                colorRes = R.color.web_dialog_source_sdcard_color
            }
            WebUrlSource.INTENT -> {
                textRes = R.string.web_dialog_source_intent
                colorRes = R.color.web_dialog_source_other_color
            }
            WebUrlSource.SESSION -> {
                textRes = R.string.web_dialog_source_session
                colorRes = R.color.web_dialog_source_other_color
            }
            WebUrlSource.DEFAULT -> {
                textRes = R.string.web_dialog_source_default
                colorRes = R.color.web_dialog_source_other_color
            }
        }
        tvSource.setText(textRes)
        tvSource.setTextColor(ContextCompat.getColor(context, colorRes))
    }

    /**
     * 保存按钮回调。所有方法在**主线程**触发（由用户点击驱动）。
     */
    interface OnSaveListener {
        /**
         * 用户在弹框输入了一个非空 url 并点击了保存按钮。
         *
         * 宿主通常需要：把 [newUrl] 落盘 + 触发 WebView 重新加载；
         * 回调返回后弹框会自动 dismiss，无需手动关闭。
         *
         * @param newUrl 已 trim 的新 url，保证非空
         */
        fun onSave(newUrl: String)
    }
}
