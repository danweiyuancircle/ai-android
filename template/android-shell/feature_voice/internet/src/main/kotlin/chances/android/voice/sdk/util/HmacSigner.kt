package chances.android.voice.sdk.util

import android.util.Base64
import java.net.URLEncoder
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object HmacSigner {

    fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data)
    }

    fun signIfly(host: String, path: String, apiKey: String, apiSecret: String): String {
        val sdf = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("GMT")
        val date = sdf.format(Date())

        val signatureOrigin = "host: $host\ndate: $date\nGET $path HTTP/1.1"
        val signatureBytes = hmacSha256(apiSecret.toByteArray(), signatureOrigin.toByteArray())
        val signature = base64Encode(signatureBytes)

        val authOrigin = "api_key=\"$apiKey\", algorithm=\"hmac-sha256\", " +
                "headers=\"host date request-line\", signature=\"$signature\""
        val authorization = base64Encode(authOrigin.toByteArray())

        val encodedDate = URLEncoder.encode(date, "UTF-8")
        val encodedHost = URLEncoder.encode(host, "UTF-8")
        val encodedAuth = URLEncoder.encode(authorization, "UTF-8")

        return "wss://$host$path?authorization=$encodedAuth&date=$encodedDate&host=$encodedHost"
    }

    fun signTencent(
        secretId: String,
        secretKey: String,
        service: String,
        action: String,
        body: String,
        timestamp: Long = System.currentTimeMillis() / 1000,
        version: String? = null
    ): Map<String, String> {
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date(timestamp * 1000))

        val canonicalRequest = "POST\n/\n\ncontent-type:application/json; charset=utf-8\n" +
                "host:$service.tencentcloudapi.com\n\ncontent-type;host\n" +
                sha256Hex(body)

        val credentialScope = "$date/$service/tc3_request"
        val stringToSign = "TC3-HMAC-SHA256\n$timestamp\n$credentialScope\n${sha256Hex(canonicalRequest)}"

        val secretDate = hmacSha256(("TC3$secretKey").toByteArray(), date.toByteArray())
        val secretService = hmacSha256(secretDate, service.toByteArray())
        val secretSigning = hmacSha256(secretService, "tc3_request".toByteArray())
        val signature = hmacSha256(secretSigning, stringToSign.toByteArray())
            .joinToString("") { "%02x".format(it) }

        val authorization = "TC3-HMAC-SHA256 Credential=$secretId/$credentialScope, " +
                "SignedHeaders=content-type;host, Signature=$signature"

        return mapOf(
            "Authorization" to authorization,
            "Content-Type" to "application/json; charset=utf-8",
            "Host" to "$service.tencentcloudapi.com",
            "X-TC-Action" to action,
            "X-TC-Version" to (version ?: defaultVersion(service)),
            "X-TC-Timestamp" to timestamp.toString()
        )
    }

    private fun defaultVersion(service: String): String {
        return when (service) {
            "asr" -> "2019-06-14"
            "tts" -> "2019-08-23"
            else -> "2019-06-14"
        }
    }

    fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun base64Encode(data: ByteArray): String {
        return Base64.encodeToString(data, Base64.NO_WRAP)
    }
}
