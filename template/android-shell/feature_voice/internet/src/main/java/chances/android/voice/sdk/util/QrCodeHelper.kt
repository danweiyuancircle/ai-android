package chances.android.voice.sdk.util

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface

/**
 * Utility for generating connection info used to pair a phone remote with the TV.
 *
 * Note: This does NOT generate an actual QR code bitmap (that would require a third-party
 * library such as ZXing). Instead, [generateInfoBitmap] produces a human-readable fallback
 * Bitmap that displays the connection URI so users can enter it manually or apps can overlay
 * it with a real QR code via their own library.
 */
object QrCodeHelper {

    /**
     * Returns the connection URI string in the format `voiceremote://ip:port`.
     * This URI can be encoded into a QR code by any ZXing-compatible library.
     */
    fun getConnectionUri(ip: String, port: Int): String = "voiceremote://$ip:$port"

    /**
     * Creates a [Bitmap] displaying the connection info (IP + port + URI).
     * The bitmap has a white background with black text, sized [size] × [size] pixels.
     *
     * @param ip   The device's LAN IP address.
     * @param port The WebSocket server port.
     * @param size Width and height of the resulting bitmap in pixels (default 400).
     */
    fun generateInfoBitmap(ip: String, port: Int, size: Int = 400): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Background
        canvas.drawColor(Color.WHITE)

        val padding = size * 0.05f
        val centerX = size / 2f
        val uri = getConnectionUri(ip, port)

        // Title paint
        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = size * 0.065f
            typeface = Typeface.DEFAULT_BOLD
            textAlign = Paint.Align.CENTER
        }

        // Body paint
        val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.DKGRAY
            textSize = size * 0.05f
            typeface = Typeface.MONOSPACE
            textAlign = Paint.Align.CENTER
        }

        // Small label paint
        val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.GRAY
            textSize = size * 0.04f
            typeface = Typeface.DEFAULT
            textAlign = Paint.Align.CENTER
        }

        // Border rect
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            style = Paint.Style.STROKE
            strokeWidth = size * 0.008f
        }
        val inset = size * 0.02f
        canvas.drawRect(inset, inset, size - inset, size - inset, borderPaint)

        // Layout — evenly spaced lines
        val lineHeight = size * 0.12f
        var y = padding + lineHeight

        canvas.drawText("Voice Remote", centerX, y, titlePaint)
        y += lineHeight

        canvas.drawText("Connect via:", centerX, y, labelPaint)
        y += lineHeight * 0.8f

        canvas.drawText(ip, centerX, y, bodyPaint)
        y += lineHeight * 0.7f

        canvas.drawText("Port: $port", centerX, y, bodyPaint)
        y += lineHeight

        // Divider line
        val dividerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.LTGRAY
            strokeWidth = size * 0.005f
        }
        canvas.drawLine(padding * 2, y, size - padding * 2, y, dividerPaint)
        y += lineHeight * 0.6f

        canvas.drawText("URI:", centerX, y, labelPaint)
        y += lineHeight * 0.8f

        // Draw URI in smaller font, possibly wrapping
        drawWrappedText(canvas, uri, bodyPaint.apply { textSize = size * 0.038f },
            centerX, y, size - padding * 4)

        return bitmap
    }

    /**
     * Draws [text] centered at ([cx], [startY]), breaking into multiple lines if the text
     * is wider than [maxWidth].
     */
    private fun drawWrappedText(
        canvas: Canvas,
        text: String,
        paint: Paint,
        cx: Float,
        startY: Float,
        maxWidth: Float
    ) {
        val lineHeight = paint.textSize * 1.4f
        val words = text.toCharArray()

        // Simple character-level wrap
        val lines = mutableListOf<String>()
        var current = StringBuilder()
        for (ch in words) {
            current.append(ch)
            if (paint.measureText(current.toString()) > maxWidth) {
                // Back off one char
                if (current.length > 1) {
                    lines.add(current.dropLast(1).toString())
                    current = StringBuilder().append(ch)
                } else {
                    lines.add(current.toString())
                    current = StringBuilder()
                }
            }
        }
        if (current.isNotEmpty()) lines.add(current.toString())

        var y = startY
        for (line in lines) {
            canvas.drawText(line, cx, y, paint)
            y += lineHeight
        }
    }
}
