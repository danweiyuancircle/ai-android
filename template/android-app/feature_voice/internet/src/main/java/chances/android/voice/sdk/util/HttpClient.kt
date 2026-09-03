package chances.android.voice.sdk.util

import android.os.Handler
import android.os.Looper
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class HttpResult(
    val code: Int,
    val body: String?,
    val error: Exception?
)

object HttpClient {
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun get(url: String, headers: Map<String, String> = emptyMap(), callback: (HttpResult) -> Unit) {
        executor.execute {
            val result = doRequest(url, "GET", headers, null)
            mainHandler.post { callback(result) }
        }
    }

    fun postJson(url: String, headers: Map<String, String> = emptyMap(), body: String, callback: (HttpResult) -> Unit) {
        executor.execute {
            val allHeaders = headers.toMutableMap()
            if (!allHeaders.containsKey("Content-Type")) {
                allHeaders["Content-Type"] = "application/json; charset=utf-8"
            }
            val result = doRequest(url, "POST", allHeaders, body)
            mainHandler.post { callback(result) }
        }
    }

    private fun doRequest(url: String, method: String, headers: Map<String, String>, body: String?): HttpResult {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 15_000
                readTimeout = 15_000
                headers.forEach { (k, v) -> setRequestProperty(k, v) }
                if (body != null) {
                    doOutput = true
                    OutputStreamWriter(outputStream, Charsets.UTF_8).use { it.write(body) }
                }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseBody = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
            }
            HttpResult(code, responseBody, null)
        } catch (e: Exception) {
            HttpResult(-1, null, e)
        } finally {
            conn?.disconnect()
        }
    }
}
