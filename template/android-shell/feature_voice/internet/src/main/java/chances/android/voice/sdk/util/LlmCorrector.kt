package chances.android.voice.sdk.util

import org.json.JSONArray
import org.json.JSONObject

/**
 * Uses a LLM (e.g. Doubao) to correct ASR recognition errors.
 * Calls a compatible OpenAI-style chat completion API.
 */
object LlmCorrector {

    fun correct(
        text: String,
        apiKey: String,
        baseUrl: String,
        model: String,
        callback: (corrected: String) -> Unit
    ) {
        if (text.isBlank()) {
            callback(text)
            return
        }

        val messages = JSONArray().apply {
            put(JSONObject().apply {
                put("role", "system")
                put("content", "你是一个语音识别纠错助手。用户会给你一段语音识别的原始文本，可能包含错别字、同音字错误或语序问题。请直接返回纠正后的文本，不要解释，不要加标点以外的额外内容。如果文本没有错误，直接返回原文。")
            })
            put(JSONObject().apply {
                put("role", "user")
                put("content", text)
            })
        }

        val body = JSONObject().apply {
            put("model", model)
            put("messages", messages)
            put("max_tokens", 256)
            put("temperature", 0.1)
        }.toString()

        val headers = mapOf(
            "Authorization" to "Bearer $apiKey",
            "Content-Type" to "application/json"
        )

        val url = "${baseUrl.trimEnd('/')}/chat/completions"

        HttpClient.postJson(url, headers, body) { result ->
            if (result.error != null || result.body == null) {
                SdkLog.w("LlmCorrector", "LLM request failed: ${result.error?.message}")
                callback(text) // fallback to original
                return@postJson
            }
            try {
                val json = JSONObject(result.body)
                val choices = json.optJSONArray("choices")
                val content = choices?.optJSONObject(0)
                    ?.optJSONObject("message")
                    ?.optString("content", text) ?: text
                val corrected = content.trim()
                if (corrected.isNotEmpty()) {
                    SdkLog.i("LlmCorrector", "Corrected: \"$text\" → \"$corrected\"")
                    callback(corrected)
                } else {
                    callback(text)
                }
            } catch (e: Exception) {
                SdkLog.w("LlmCorrector", "Parse error: ${e.message}")
                callback(text)
            }
        }
    }
}
