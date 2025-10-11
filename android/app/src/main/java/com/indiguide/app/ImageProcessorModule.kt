package com.indiguide.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.File

class ImageProcessorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ImageProcessor"
    }

    /**
     * Base64 인코딩된 이미지를 RGB Float32Array로 변환
     * @param base64Image Base64 인코딩된 이미지 문자열
     * @param targetWidth 목표 너비
     * @param targetHeight 목표 높이
     * @param promise Promise로 결과 반환
     */
    @ReactMethod
    fun decodeImageToRGB(
        base64Image: String,
        targetWidth: Int,
        targetHeight: Int,
        promise: Promise
    ) {
        try {
            // Base64 디코딩
            val imageBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode base64 image")
                return
            }

            // 비트맵 처리
            val result = processBitmap(bitmap, targetWidth, targetHeight)
            bitmap.recycle()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", "Error processing base64 image: ${e.message}", e)
        }
    }

    /**
     * URI 경로의 이미지를 RGB Float32Array로 변환
     * @param imageUri 이미지 파일 URI (file:// 형식)
     * @param targetWidth 목표 너비
     * @param targetHeight 목표 높이
     * @param orientation 카메라 orientation
     * @param promise Promise로 결과 반환
     */
    @ReactMethod
    fun decodeImageFromUri(
        imageUri: String,
        targetWidth: Int,
        targetHeight: Int,
        orientation: String,
        promise: Promise
    ) {
        try {
            // URI에서 파일 경로 추출
            val filePath = if (imageUri.startsWith("file://")) {
                imageUri.substring(7)
            } else {
                imageUri
            }

            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found: $filePath")
                return
            }

            // 비트맵 로드
            var bitmap = BitmapFactory.decodeFile(filePath)
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image from URI: $filePath")
                return
            }

            // orientation 파라미터가 portrait가 아니면 회전 적용
            if (orientation != "portrait") {
                android.util.Log.d("ImageProcessor", "Camera orientation: $orientation, Original size: ${bitmap.width}x${bitmap.height}")
                
                // React Native Vision Camera orientation 값을 회전 각도로 변환
                val rotationDegrees = when (orientation) {
                    "landscape-left" -> 90f   // 왼쪽으로 눕혀진 경우, 시계방향 90도 회전 필요
                    "landscape-right" -> 270f  // 오른쪽으로 눕혀진 경우, 반시계방향 90도 회전 필요
                    "portrait-upside-down" -> 180f
                    else -> 0f
                }
                
                if (rotationDegrees != 0f) {
                    bitmap = rotateBitmapByDegrees(bitmap, rotationDegrees)
                    android.util.Log.d("ImageProcessor", "Rotated by ${rotationDegrees}°, New size: ${bitmap.width}x${bitmap.height}")
                }
            } else {
                // EXIF orientation 읽기 및 회전 적용
                val exif = ExifInterface(filePath)
                val exifOrientation = exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
                
                val orientationName = when (exifOrientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> "ROTATE_90"
                    ExifInterface.ORIENTATION_ROTATE_180 -> "ROTATE_180"
                    ExifInterface.ORIENTATION_ROTATE_270 -> "ROTATE_270"
                    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> "FLIP_HORIZONTAL"
                    ExifInterface.ORIENTATION_FLIP_VERTICAL -> "FLIP_VERTICAL"
                    ExifInterface.ORIENTATION_TRANSPOSE -> "TRANSPOSE"
                    ExifInterface.ORIENTATION_TRANSVERSE -> "TRANSVERSE"
                    else -> "NORMAL"
                }
                
                android.util.Log.d("ImageProcessor", "EXIF orientation: $orientationName ($exifOrientation), Original size: ${bitmap.width}x${bitmap.height}")
                
                bitmap = rotateBitmapByExif(bitmap, exifOrientation)
                
                android.util.Log.d("ImageProcessor", "After rotation: ${bitmap.width}x${bitmap.height}")
            }

            // 비트맵 처리
            val result = processBitmap(bitmap, targetWidth, targetHeight)
            bitmap.recycle()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", "Error processing image from URI: ${e.message}", e)
        }
    }

    /**
     * 각도로 비트맵 회전
     */
    private fun rotateBitmapByDegrees(bitmap: Bitmap, degrees: Float): Bitmap {
        if (degrees == 0f) return bitmap
        
        val matrix = Matrix()
        matrix.postRotate(degrees)
        
        val rotatedBitmap = Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            matrix,
            true
        )
        
        if (rotatedBitmap != bitmap) {
            bitmap.recycle()
        }
        
        return rotatedBitmap
    }

    /**
     * EXIF orientation에 따라 비트맵 회전
     */
    private fun rotateBitmapByExif(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f)
                matrix.preScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(270f)
                matrix.preScale(-1f, 1f)
            }
            else -> return bitmap // ORIENTATION_NORMAL 또는 UNDEFINED
        }
        
        val rotatedBitmap = Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            matrix,
            true
        )
        
        if (rotatedBitmap != bitmap) {
            bitmap.recycle()
        }
        
        return rotatedBitmap
    }

    /**
     * 비트맵을 처리하여 RGB Float32Array로 변환 (NCHW 포맷)
     */
    private fun processBitmap(
        originalBitmap: Bitmap,
        targetWidth: Int,
        targetHeight: Int
    ): WritableMap {
        // 1. 정사각형으로 Center Crop (aspect ratio 유지)
        val width = originalBitmap.width
        val height = originalBitmap.height
        val size = minOf(width, height)
        
        val x = (width - size) / 2
        val y = (height - size) / 2
        
        val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
        android.util.Log.d("ImageProcessor", "Center crop: ${width}x${height} -> ${size}x${size}")
        
        // 2. 정사각형 이미지를 목표 크기로 리사이즈
        val resizedBitmap = Bitmap.createScaledBitmap(
            croppedBitmap,
            targetWidth,
            targetHeight,
            true
        )
        
        if (croppedBitmap != originalBitmap) {
            croppedBitmap.recycle()
        }

        // 3. RGB 데이터 추출 (NCHW 포맷: [R채널, G채널, B채널])
        val pixels = IntArray(targetWidth * targetHeight)
        resizedBitmap.getPixels(pixels, 0, targetWidth, 0, 0, targetWidth, targetHeight)

        // 4. NCHW 포맷으로 변환 (YOLOv8 입력 형식)
        val dataSize = 3 * targetWidth * targetHeight
        val rgbData = WritableNativeArray()

        // R 채널
        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            rgbData.pushDouble(r.toDouble())
        }

        // G 채널
        for (pixel in pixels) {
            val g = ((pixel shr 8) and 0xFF) / 255.0f
            rgbData.pushDouble(g.toDouble())
        }

        // B 채널
        for (pixel in pixels) {
            val b = (pixel and 0xFF) / 255.0f
            rgbData.pushDouble(b.toDouble())
        }

        // 비트맵 정리
        if (resizedBitmap != originalBitmap) {
            resizedBitmap.recycle()
        }

        // 5. 결과 반환 (crop offset 정보 포함)
        val result = WritableNativeMap()
        result.putArray("data", rgbData)
        result.putInt("width", targetWidth)
        result.putInt("height", targetHeight)
        result.putInt("channels", 3)
        result.putInt("cropX", x)
        result.putInt("cropY", y)
        result.putInt("cropSize", size)
        result.putInt("originalWidth", width)
        result.putInt("originalHeight", height)

        return result
    }
}

